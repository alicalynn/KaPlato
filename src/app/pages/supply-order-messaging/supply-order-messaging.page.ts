import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { SupplyOrderMessagingService, SupplyOrderMessage } from '../../services/supply-order-messaging.service';
import { AuthService } from '../../services/auth.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { close, trashOutline, chatbubblesOutline, sendOutline } from 'ionicons/icons';

@Component({
  selector: 'app-supply-order-messaging',
  templateUrl: './supply-order-messaging.page.html',
  styleUrls: ['./supply-order-messaging.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class SupplyOrderMessagingPage implements OnInit, AfterViewChecked, OnDestroy {
  @Input() orderId: number = 0;
  @Input() supplierId: number = 0;
  @Input() karenderiaId: number = 0;
  @Input() otherPartyName: string = 'Other Party';
  @Input() onDismiss?: () => void;  // Callback to refresh parent's unread count
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  messages: SupplyOrderMessage[] = [];
  newMessage: string = '';
  currentUserId: string = '';
  isSendingMessage = false;
  private shouldScroll = false;
  private pollSubscription?: Subscription;
  private lastMessageId = 0;

  constructor(
    private messagingService: SupplyOrderMessagingService,
    private modalController: ModalController,
    private alertController: AlertController,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    addIcons({
      close,
      'trash-outline': trashOutline,
      'chatbubbles-outline': chatbubblesOutline,
      'send-outline': sendOutline
    });
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.startRealtimePolling();
  }

  ngOnDestroy() {
    this.pollSubscription?.unsubscribe();
    // Notify parent to clear unread badge when modal closes
    if (this.onDismiss) {
      this.onDismiss();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private loadCurrentUser() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId = String(user.id);
    }
  }

  private startRealtimePolling() {
    this.pollSubscription = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.messagingService.getMessages(this.orderId))
      )
      .subscribe({
        next: (messages) => {
          const newestId = messages.length ? messages[messages.length - 1].id : 0;
          
          // Only update messages if there are new messages or count changed
          if (newestId !== this.lastMessageId || this.messages.length !== messages.length) {
            this.messages = messages;
            this.lastMessageId = newestId;
            this.shouldScroll = true;
          }
        },
        error: (error) => {
          console.error('Error loading supply order messages:', error);
        }
      });
  }

  sendMessage() {
    if (!this.newMessage || !this.newMessage.trim() || this.isSendingMessage) {
      return;
    }

    const content = this.newMessage.trim();
    this.isSendingMessage = true;

    this.messagingService.sendMessage(this.orderId, content).subscribe({
      next: (message) => {
        this.messages = [...this.messages, message];
        this.lastMessageId = message.id;
        this.newMessage = '';
        this.isSendingMessage = false;
        this.shouldScroll = true;
      },
      error: (error) => {
        console.error('Error sending supply order message:', error);
        this.isSendingMessage = false;
        this.showToast(error?.error?.error || 'Failed to send message');
      }
    });
  }

  isSentByCurrentUser(message: SupplyOrderMessage): boolean {
    return Number(this.currentUserId) === message.from_user_id;
  }

  private scrollToBottom() {
    try {
      if (this.messageContainer) {
        const element = this.messageContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  async clearConversation() {
    const alert = await this.alertController.create({
      header: 'Clear Conversation',
      message: 'Are you sure you want to delete all messages in this conversation? This cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            this.messagingService.clearMessages(this.orderId).subscribe({
              next: async () => {
                this.messages = [];
                this.lastMessageId = 0;
                await this.showToast('Conversation cleared');
              },
              error: async (error) => {
                console.error('Error clearing conversation:', error);
                await this.showToast(error?.error?.error || 'Failed to clear conversation');
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  dismissModal() {
    // Call the callback before dismissing to refresh parent's badge
    if (this.onDismiss) {
      this.onDismiss();
    }
    this.modalController.dismiss();
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });

    await toast.present();
  }
}
