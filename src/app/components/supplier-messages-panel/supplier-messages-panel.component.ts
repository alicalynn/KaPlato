import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, IonContent, AlertController, ToastController } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, timeout } from 'rxjs/operators';
import { MessageService, Message, Conversation } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { InventoryService, SupplyOrder } from '../../services/inventory.service';
import { SupplyOrderMessagingService, SupplyOrderMessage } from '../../services/supply-order-messaging.service';
import { SupplyOrderMessagingPage } from '../../pages/supply-order-messaging/supply-order-messaging.page';
import { addIcons } from 'ionicons';
import {
  chatbubbleOutline,
  sendOutline,
  callOutline,
  phonePortraitOutline,
  searchOutline,
  refreshOutline,
  arrowBackOutline,
  checkmarkDoneOutline,
  chevronForwardOutline
} from 'ionicons/icons';

export interface SupplierMessageThread {
  id: string;
  type: 'supply' | 'request';
  contactName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  supplyOrder?: SupplyOrder;
  conversation?: Conversation;
}

export interface SupplierActiveChat {
  type: 'supply' | 'request';
  supplyOrder?: SupplyOrder;
  conversation?: Conversation;
}

@Component({
  selector: 'app-supplier-messages-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SupplyOrderMessagingPage],
  templateUrl: './supplier-messages-panel.component.html',
  styleUrls: ['./supplier-messages-panel.component.scss']
})
export class SupplierMessagesPanelComponent implements OnInit {
  @Output() unreadTotalChange = new EventEmitter<number>();
  @ViewChild('messageContent') messageContent!: IonContent;

  messageThreads: SupplierMessageThread[] = [];
  activeChat: SupplierActiveChat | null = null;
  conversationMessages: Message[] = [];

  isLoadingInbox = false;
  isLoadingMessages = false;
  isSendingMessage = false;

  newMessage = '';
  searchTerm = '';
  unreadCount = 0;
  currentUserId = 0;

  private pendingRequestId?: number;
  private pendingUserId?: number;
  private pendingOrderId?: number;

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private inventoryService: InventoryService,
    private supplyMessagingService: SupplyOrderMessagingService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({
      'chatbubble-outline': chatbubbleOutline,
      'send-outline': sendOutline,
      'call-outline': callOutline,
      'phone-portrait-outline': phonePortraitOutline,
      'search-outline': searchOutline,
      'refresh-outline': refreshOutline,
      'arrow-back-outline': arrowBackOutline,
      'checkmark-done-outline': checkmarkDoneOutline,
      'chevron-forward-outline': chevronForwardOutline
    });
  }

  ngOnInit() {
    const userId = this.authService.getCurrentUser()?.id;
    this.currentUserId = userId ? Number(userId) : 0;

    this.route.queryParams.subscribe(params => {
      if (params['requestId'] && params['userId']) {
        this.pendingRequestId = Number(params['requestId']);
        this.pendingUserId = Number(params['userId']);
      }
      if (params['orderId']) {
        this.pendingOrderId = Number(params['orderId']);
      }
      if (!this.isLoadingInbox && this.messageThreads.length) {
        this.tryOpenPendingTargets();
      }
    });

    this.loadInbox();
  }

  loadInbox() {
    this.isLoadingInbox = true;
    this.activeChat = null;

    forkJoin({
      orders: this.inventoryService.getSupplierSupplyOrders().pipe(
        map((r: any) => (Array.isArray(r) ? r : r?.data) || []),
        catchError(() => of([]))
      ),
      conversations: this.messageService.getConversations(1).pipe(
        catchError(() => of([] as Conversation[]))
      )
    }).pipe(
      timeout(15000),
      catchError(() => of({ orders: [] as SupplyOrder[], conversations: [] as Conversation[] })),
      finalize(() => {
        this.isLoadingInbox = false;
      })
    ).subscribe({
      next: ({ orders, conversations }) => {
        this.buildThreads(orders, conversations);
        this.enrichSupplyThreadPreviews(orders);
        this.tryOpenPendingTargets();
      },
      error: () => this.showToast('Failed to load messages')
    });
  }

  private buildThreads(orders: SupplyOrder[], conversations: Conversation[]) {
    const byKarenderia = new Map<number, SupplierMessageThread>();
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const order of sortedOrders) {
      const karenderiaId = order.karenderia_id;
      if (byKarenderia.has(karenderiaId)) {
        continue;
      }

      const contactName = order.karenderia?.business_name || order.karenderia?.name || 'Karenderia';
      byKarenderia.set(karenderiaId, {
        id: `supply-${karenderiaId}`,
        type: 'supply',
        contactName,
        lastMessage: 'Tap to open conversation',
        lastMessageAt: order.created_at,
        unreadCount: 0,
        supplyOrder: order
      });
    }

    const requestThreads = this.buildRequestThreads(conversations);
    this.messageThreads = [...byKarenderia.values(), ...requestThreads].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    this.notifyUnreadTotal();
  }

  private buildRequestThreads(conversations: Conversation[] | null | undefined): SupplierMessageThread[] {
    const list = Array.isArray(conversations) ? conversations : [];
    return list.map(conv => ({
      id: `request-${conv.id}`,
      type: 'request' as const,
      contactName: this.getOtherUserName(conv),
      lastMessage: (conv.message || '').trim() || 'No messages yet',
      lastMessageAt: conv.created_at,
      unreadCount: 0,
      conversation: conv
    }));
  }

  private enrichSupplyThreadPreviews(orders: SupplyOrder[]) {
    const seen = new Set<number>();
    for (const order of orders) {
      if (seen.has(order.karenderia_id)) {
        continue;
      }
      seen.add(order.karenderia_id);

      this.supplyMessagingService.getMessages(order.id).pipe(
        timeout(8000),
        catchError(() => of([] as SupplyOrderMessage[]))
      ).subscribe(messages => {
        const thread = this.messageThreads.find(t => t.id === `supply-${order.karenderia_id}`);
        if (!thread) {
          return;
        }
        const lastMsg = messages.length ? messages[messages.length - 1] : null;
        if (lastMsg?.message?.trim()) {
          thread.lastMessage = lastMsg.message.trim();
          thread.lastMessageAt = lastMsg.created_at;
        } else {
          thread.lastMessage = 'No messages yet — tap to start chatting';
        }
        thread.unreadCount = messages.filter(
          m => !m.is_read && m.to_user_id === this.currentUserId
        ).length;
        this.messageThreads = [...this.messageThreads].sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
        this.notifyUnreadTotal();
      });
    }
  }

  private tryOpenPendingTargets() {
    if (this.pendingOrderId) {
      const thread = this.messageThreads.find(
        t => t.type === 'supply' && t.supplyOrder?.id === this.pendingOrderId
      );
      if (thread) {
        this.openThread(thread);
        this.pendingOrderId = undefined;
        return;
      }
    }

    if (this.pendingRequestId && this.pendingUserId) {
      const thread = this.messageThreads.find(t => {
        if (t.type !== 'request' || !t.conversation) {
          return false;
        }
        const conv = t.conversation;
        return conv.ingredientRequest?.id === this.pendingRequestId &&
          (conv.from_user_id === this.pendingUserId || conv.to_user_id === this.pendingUserId);
      });
      if (thread) {
        this.openThread(thread);
        this.pendingRequestId = undefined;
        this.pendingUserId = undefined;
      }
    }
  }

  loadUnreadCount() {
    this.messageService.getUnreadCount().subscribe({
      next: (data) => {
        const ingredientUnread = data?.unread_count ?? data?.count ?? 0;
        const supplyUnread = this.messageThreads
          .reduce((sum, t) => sum + (t.unreadCount || 0), 0);
        this.unreadCount = ingredientUnread + supplyUnread;
        this.unreadTotalChange.emit(this.unreadCount);
      }
    });
  }

  formatUnreadBadge(count: number): string {
    if (count > 99) {
      return '99+';
    }
    return String(count);
  }

  private notifyUnreadTotal() {
    this.loadUnreadCount();
  }

  getFilteredThreads(): SupplierMessageThread[] {
    if (!this.searchTerm.trim()) {
      return this.messageThreads;
    }
    const term = this.searchTerm.toLowerCase();
    return this.messageThreads.filter(t =>
      t.contactName.toLowerCase().includes(term) ||
      t.lastMessage.toLowerCase().includes(term)
    );
  }

  openThread(thread: SupplierMessageThread) {
    if (thread.type === 'supply' && thread.supplyOrder) {
      this.activeChat = { type: 'supply', supplyOrder: thread.supplyOrder };
      thread.unreadCount = 0;
      this.notifyUnreadTotal();
      return;
    }
    if (thread.type === 'request' && thread.conversation) {
      this.activeChat = { type: 'request', conversation: thread.conversation };
      thread.unreadCount = 0;
      this.loadConversationMessages(thread.conversation);
      this.notifyUnreadTotal();
    }
  }

  backToInbox() {
    this.activeChat = null;
    this.conversationMessages = [];
    this.newMessage = '';
    this.loadInbox();
  }

  loadConversationMessages(conversation: Conversation) {
    const requestId = conversation.ingredientRequest?.id || conversation.ingredient_request_id;
    if (!requestId) {
      this.showToast('Cannot load conversation');
      return;
    }

    this.isLoadingMessages = true;
    const otherUserId = conversation.from_user_id === this.currentUserId
      ? conversation.to_user_id
      : conversation.from_user_id;

    this.messageService.getConversation(requestId, otherUserId).subscribe({
      next: (response: any) => {
        const payload = response?.data;
        this.conversationMessages = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.data) ? payload.data : []);
        this.isLoadingMessages = false;
        setTimeout(() => this.scrollToBottom(), 100);
        this.notifyUnreadTotal();
      },
      error: () => {
        this.isLoadingMessages = false;
        this.showToast('Failed to load messages');
      }
    });
  }

  sendMessage() {
    const conversation = this.activeChat?.conversation;
    if (!this.newMessage.trim() || !conversation) {
      return;
    }

    const requestId = conversation.ingredientRequest?.id || conversation.ingredient_request_id;
    if (!requestId) {
      return;
    }

    const otherUserId = conversation.from_user_id === this.currentUserId
      ? conversation.to_user_id
      : conversation.from_user_id;

    this.isSendingMessage = true;
    this.messageService.sendMessage({
      to_user_id: otherUserId,
      ingredient_request_id: requestId,
      message: this.newMessage,
      type: 'text'
    }).subscribe({
      next: (response) => {
        this.conversationMessages.push(response?.data);
        this.newMessage = '';
        this.isSendingMessage = false;
        this.scrollToBottom();
      },
      error: () => {
        this.isSendingMessage = false;
        this.showToast('Failed to send message');
      }
    });
  }

  async requestCall() {
    if (!this.activeChat?.conversation) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Request a Call',
      message: 'Enter your phone number:',
      inputs: [{ name: 'phone', type: 'tel', placeholder: '09XXXXXXXXX' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send',
          handler: (data) => {
            if (data.phone) {
              this.sendCallRequest(data.phone);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  sendCallRequest(phoneNumber: string) {
    const conversation = this.activeChat?.conversation;
    if (!conversation?.ingredientRequest?.id) {
      return;
    }

    const otherUserId = conversation.from_user_id === this.currentUserId
      ? conversation.to_user_id
      : conversation.from_user_id;

    this.messageService.sendMessage({
      to_user_id: otherUserId,
      ingredient_request_id: conversation.ingredientRequest.id,
      message: `Call request from ${phoneNumber}`,
      type: 'call_request',
      call_phone_number: phoneNumber
    }).subscribe({
      next: (response) => {
        this.conversationMessages.push(response?.data);
        this.scrollToBottom();
      },
      error: () => this.showToast('Failed to send call request')
    });
  }

  scrollToBottom() {
    if (this.messageContent) {
      setTimeout(() => this.messageContent.scrollToBottom(200), 100);
    }
  }

  getOtherUserName(conversation: Conversation): string {
    if (conversation.from_user_id === this.currentUserId) {
      return conversation.toUser?.name || 'Karenderia Owner';
    }
    return conversation.fromUser?.name || 'Karenderia Owner';
  }

  isMessageFromCurrentUser(message: Message): boolean {
    return message.from_user_id === this.currentUserId;
  }

  formatTime(dateTime: string): string {
    try {
      const date = new Date(dateTime);
      const now = new Date();
      const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return dateTime;
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
