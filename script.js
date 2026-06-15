/**
 * TaurosApp Chat - Modern Chat Interface
 * Advanced JavaScript functionality for chat interactions
 */

class TaurosChat {
    constructor() {
        this.init();
        this.bindEvents();
        this.setupIntersectionObserver();
        this.loadTheme();
        this.setWelcomeTime();
    }

    init() {
        // DOM elements
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.charCount = document.getElementById('charCount');
        this.themeToggle = document.getElementById('themeToggle');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.emojiBtn = document.getElementById('emojiBtn');
        this.emojiPicker = document.getElementById('emojiPicker');
        this.attachBtn = document.getElementById('attachBtn');
        this.settingsBtn = document.getElementById('settingsBtn');

        // State
        this.isTyping = false;
        this.messageCount = 0;
        this.currentTheme = 'dark';
        this.typingTimeout = null;
        this.lastActivity = Date.now();
        this.messageObserver = null;
        this.ariaLiveRegion = document.getElementById('ariaLiveRegion');
        this.attachmentInput = this.createAttachmentInput();

        // Auto-resize textarea
        this.setupAutoResize();
        
        // Update char count initially
        this.updateCharCount();
    }

    bindEvents() {
        // Send message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.messageInput.addEventListener('input', () => {
            this.updateCharCount();
            this.autoResize();
            this.handleTypingIndicator();
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Emoji picker
        this.emojiBtn.addEventListener('click', () => this.toggleEmojiPicker());
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // Emoji selection
        this.emojiPicker.addEventListener('click', (e) => {
            if (e.target.dataset.emoji) {
                this.insertEmoji(e.target.dataset.emoji);
            }
        });

        // Attach button (placeholder)
        this.attachBtn.addEventListener('click', () => this.handleAttachment());

        // Settings button (placeholder)
        this.settingsBtn.addEventListener('click', () => this.openSettings());

        // Window events
        window.addEventListener('focus', () => this.handleWindowFocus());
        window.addEventListener('blur', () => this.handleWindowBlur());
        window.addEventListener('beforeunload', () => this.cleanup());

        // Accessibility
        this.messageInput.addEventListener('focus', () => this.handleInputFocus());
        this.messageInput.addEventListener('blur', () => this.handleInputBlur());
    }

    setupAutoResize() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }

    autoResize() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = count;
        
        // Update send button state
        this.sendBtn.disabled = count === 0;
        
        // Char count color coding
        if (count > 1800) {
            this.charCount.style.color = 'var(--accent-danger)';
        } else if (count > 1500) {
            this.charCount.style.color = 'var(--accent-warning)';
        } else {
            this.charCount.style.color = 'var(--text-muted)';
        }
    }

    handleKeyDown(e) {
        // Ctrl+Enter to send
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.sendMessage();
            return;
        }

        // Escape to close emoji picker
        if (e.key === 'Escape') {
            this.hideEmojiPicker();
            return;
        }

        // Tab navigation
        if (e.key === 'Tab' && this.emojiPicker.classList.contains('show')) {
            e.preventDefault();
            // Focus first emoji button
            const firstEmoji = this.emojiPicker.querySelector('.emoji-btn');
            if (firstEmoji) firstEmoji.focus();
        }
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.updateCharCount();
        this.autoResize();
        
        // Simulate bot response
        this.simulateBotResponse(message);
        
        // Hide emoji picker
        this.hideEmojiPicker();
        
        // Focus back to input
        this.messageInput.focus();
    }

    addMessage(content, type = 'user', timestamp = null) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}-message`;
        
        const now = timestamp || new Date();
        const timeString = this.formatTime(now);
        
        // Process message content (basic markdown support)
        const processedContent = this.processMarkdown(content);
        
        messageElement.innerHTML = `
            <div class="message-content">
                ${processedContent}
            </div>
            <div class="message-time">
                <time datetime="${now.toISOString()}">${timeString}</time>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageElement);
        if (this.messageObserver) {
            this.messageObserver.observe(messageElement);
        }
        this.scrollToBottom();
        this.messageCount++;
        
        // Update ARIA live region
        this.updateAriaLiveRegion(content, type);
    }

    processMarkdown(text) {
        const replacements = [];
        const createPlaceholder = (html) => {
            const placeholder = `__TAUROS_MD_${replacements.length}__`;
            replacements.push({ placeholder, html });
            return placeholder;
        };

        let processedText = text.replace(/```([\s\S]*?)```/g, (_, code) => {
            return createPlaceholder(`<pre><code>${this.escapeHtml(code.trim())}</code></pre>`);
        });

        processedText = processedText.replace(/`([^`]+)`/g, (_, code) => {
            return createPlaceholder(`<code>${this.escapeHtml(code)}</code>`);
        });

        processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
            const safeUrl = this.sanitizeUrl(url);
            const safeLabel = this.escapeHtml(label);
            if (!safeUrl) {
                return safeLabel;
            }

            return createPlaceholder(
                `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`
            );
        });

        processedText = this.escapeHtml(processedText)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        replacements.forEach(({ placeholder, html }) => {
            processedText = processedText.replace(placeholder, html);
        });

        return processedText;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    sanitizeUrl(url) {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            return null;
        }

        if (trimmedUrl.startsWith('#') || trimmedUrl.startsWith('/')) {
            return this.escapeHtml(trimmedUrl);
        }

        try {
            const parsedUrl = new URL(trimmedUrl, window.location.origin);
            const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

            if (!allowedProtocols.includes(parsedUrl.protocol)) {
                return null;
            }

            const normalizedUrl = ['mailto:', 'tel:'].includes(parsedUrl.protocol)
                ? trimmedUrl
                : parsedUrl.href;

            return this.escapeHtml(normalizedUrl);
        } catch {
            return null;
        }
    }

    createAttachmentInput() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleAttachmentSelection(e));
        document.body.appendChild(fileInput);
        return fileInput;
    }

    simulateBotResponse(userMessage) {
        // Show typing indicator
        this.showTypingIndicator();
        
        setTimeout(() => {
            this.hideTypingIndicator();
            
            // Simple response logic
            let response = this.generateBotResponse(userMessage);
            this.addMessage(response, 'bot');
        }, 1000 + Math.random() * 2000);
    }

    generateBotResponse(message) {
        const responses = [
            "Interessante! Puoi dirmi di più?",
            "Capisco il tuo punto di vista. 🤔",
            "Grazie per aver condiviso questo con me!",
            "Hmm, lasciami pensare... 💭",
            "Ottima domanda! Ecco cosa penso...",
            "Mi fa piacere chattare con te! 😊",
            "Questo è un argomento affascinante.",
            "Puoi spiegarmi meglio questo concetto?",
            "Hai sollevato un punto molto valido.",
            "Mi piace il modo in cui pensi! 🚀"
        ];
        
        // Simple keyword-based responses
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('ciao') || lowerMessage.includes('salve')) {
            return "Ciao! Come posso aiutarti oggi? 👋";
        }
        
        if (lowerMessage.includes('come stai')) {
            return "Sto bene, grazie! Sono qui e pronto a chattare con te. 😊";
        }
        
        if (lowerMessage.includes('aiuto') || lowerMessage.includes('help')) {
            return "Sono qui per aiutarti! Puoi scrivermi qualsiasi cosa e io farò del mio meglio per rispondere. Supporto anche il **markdown** e gli emoji! 🎉";
        }
        
        if (lowerMessage.includes('grazie')) {
            return "Prego! È sempre un piacere aiutare. 😊";
        }
        
        // Random response
        return responses[Math.floor(Math.random() * responses.length)];
    }

    showTypingIndicator() {
        this.typingIndicator.classList.add('show');
        this.typingIndicator.setAttribute('aria-hidden', 'false');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.remove('show');
        this.typingIndicator.setAttribute('aria-hidden', 'true');
    }

    handleTypingIndicator() {
        if (!this.isTyping) {
            this.isTyping = true;
            // In a real app, you'd send a "typing" event to the server
        }
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
        }, 1000);
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }

    formatTime(date) {
        return date.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);

        this.updateThemeToggle();
        
        // Save to localStorage
        localStorage.setItem('tauros-chat-theme', this.currentTheme);
        
        // Announce to screen readers
        this.announceToScreenReader(`Tema cambiato a ${this.currentTheme === 'dark' ? 'scuro' : 'chiaro'}`);
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('tauros-chat-theme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
        }

        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeToggle();
    }

    updateThemeToggle() {
        const themeIcon = this.themeToggle.querySelector('.theme-icon');
        const nextThemeLabel = this.currentTheme === 'dark' ? 'chiaro' : 'scuro';

        themeIcon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
        this.themeToggle.setAttribute('aria-label', `Passa al tema ${nextThemeLabel}`);
    }

    toggleEmojiPicker() {
        const isShown = this.emojiPicker.classList.contains('show');
        
        if (isShown) {
            this.hideEmojiPicker();
        } else {
            this.showEmojiPicker();
        }
    }

    showEmojiPicker() {
        this.emojiPicker.classList.add('show');
        this.emojiPicker.setAttribute('aria-hidden', 'false');
        
        // Focus first emoji
        setTimeout(() => {
            const firstEmoji = this.emojiPicker.querySelector('.emoji-btn');
            if (firstEmoji) firstEmoji.focus();
        }, 100);
    }

    hideEmojiPicker() {
        this.emojiPicker.classList.remove('show');
        this.emojiPicker.setAttribute('aria-hidden', 'true');
    }

    insertEmoji(emoji) {
        const start = this.messageInput.selectionStart;
        const end = this.messageInput.selectionEnd;
        const text = this.messageInput.value;
        
        this.messageInput.value = text.substring(0, start) + emoji + text.substring(end);
        this.messageInput.selectionStart = this.messageInput.selectionEnd = start + emoji.length;
        
        this.updateCharCount();
        this.autoResize();
        this.hideEmojiPicker();
        this.messageInput.focus();
    }

    handleOutsideClick(e) {
        if (!this.emojiPicker.contains(e.target) && !this.emojiBtn.contains(e.target)) {
            this.hideEmojiPicker();
        }
    }

    handleAttachment() {
        // Placeholder for file attachment functionality
        this.announceToScreenReader('Funzionalità allegati in sviluppo');
        this.attachmentInput.value = '';
        this.attachmentInput.click();
    }

    handleAttachmentSelection(e) {
        const [file] = e.target.files;
        if (!file) {
            return;
        }

        this.addMessage(`📎 File allegato: ${file.name} (${this.formatFileSize(file.size)})`, 'user');
        e.target.value = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    openSettings() {
        // Placeholder for settings functionality
        this.announceToScreenReader('Impostazioni in sviluppo');
        console.log('Settings clicked - placeholder functionality');
    }

    handleWindowFocus() {
        this.lastActivity = Date.now();
        this.updateConnectionStatus(true);
    }

    handleWindowBlur() {
        // In a real app, you might want to reduce polling frequency
    }

    updateConnectionStatus(connected = true) {
        const indicator = this.connectionStatus.querySelector('.status-indicator');
        const text = this.connectionStatus.querySelector('.status-text');
        
        if (connected) {
            indicator.className = 'status-indicator connected';
            text.textContent = 'Connesso';
        } else {
            indicator.className = 'status-indicator disconnected';
            text.textContent = 'Disconnesso';
        }
    }

    handleInputFocus() {
        // Enhance accessibility when input is focused
        this.messageInput.setAttribute('aria-describedby', 'inputHelp');
    }

    handleInputBlur() {
        // Clean up when input loses focus
    }

    setupIntersectionObserver() {
        // For future implementation of infinite scroll
        if (!('IntersectionObserver' in window)) {
            return;
        }

        this.messageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Load more messages if needed
                    console.log('Message visible:', entry.target);
                }
            });
        }, {
            threshold: 0.1
        });

        // Observe messages for read status (future feature)
        const messages = this.messagesContainer.querySelectorAll('.message');
        messages.forEach(message => this.messageObserver.observe(message));
    }

    updateAriaLiveRegion(content, type) {
        const announcement = type === 'user' ? 
            `Hai inviato: ${content}` : 
            `Nuovo messaggio: ${content}`;
        
        this.announceToScreenReader(announcement);
    }

    announceToScreenReader(message) {
        if (!this.ariaLiveRegion) {
            return;
        }

        this.ariaLiveRegion.textContent = '';
        requestAnimationFrame(() => {
            this.ariaLiveRegion.textContent = message;
        });
    }

    setWelcomeTime() {
        const welcomeTime = document.getElementById('welcomeTime');
        if (welcomeTime) {
            const now = new Date();
            welcomeTime.textContent = this.formatTime(now);
            welcomeTime.setAttribute('datetime', now.toISOString());
        }
    }

    cleanup() {
        // Clean up any timeouts or intervals
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        if (this.messageObserver) {
            this.messageObserver.disconnect();
        }

        if (this.attachmentInput?.parentNode) {
            this.attachmentInput.parentNode.removeChild(this.attachmentInput);
        }
    }

    // Public API methods
    addSystemMessage(content) {
        this.addMessage(content, 'system');
    }

    clearMessages() {
        const messages = this.messagesContainer.querySelectorAll('.message:not(.system-message)');
        messages.forEach(message => {
            if (this.messageObserver) {
                this.messageObserver.unobserve(message);
            }
            message.style.opacity = '0';
            message.style.transform = 'translateY(-20px)';
            setTimeout(() => message.remove(), 300);
        });
        this.messageCount = 0;
    }

    exportChat() {
        const messages = Array.from(this.messagesContainer.querySelectorAll('.message')).map(msg => {
            const content = msg.querySelector('.message-content').textContent;
            const time = msg.querySelector('time').textContent;
            const type = msg.className.includes('user') ? 'user' : 
                        msg.className.includes('bot') ? 'bot' : 'system';
            return { content, time, type };
        });
        
        const chatData = {
            timestamp: new Date().toISOString(),
            messageCount: this.messageCount,
            messages: messages
        };
        
        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tauros-chat-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize the chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.taurosChat = new TaurosChat();
    
    // Add some demo functionality
    console.log('🐂 TaurosApp Chat initialized!');
    console.log('Available methods:', {
        'addSystemMessage(content)': 'Add a system message',
        'clearMessages()': 'Clear all messages',
        'exportChat()': 'Export chat as JSON'
    });
});

// Service Worker registration (for future offline support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
}