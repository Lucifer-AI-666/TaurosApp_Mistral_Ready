// TaurosApp - Core JavaScript Functionality

class TaurosApp {
    constructor() {
        this.mistralAPI = new MistralAPI();
        this.isAIMode = true;
        this.currentPersona = 'professional';
        this.currentTone = 'formal';
        this.messageHistory = [];
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.loadMessageHistory();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.requestAPIKey();
    }

    initializeElements() {
        this.chatContainer = document.getElementById('chat');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.modeToggle = document.getElementById('modeToggle');

        // Validate required elements
        if (!this.chatContainer || !this.messageInput || !this.sendBtn) {
            console.error('Required DOM elements not found');
            return;
        }

        this.updateModeToggle();
    }

    setupEventListeners() {
        // Send button
        this.sendBtn.addEventListener('click', () => this.handleSend());
        
        // Clear button
        this.clearBtn.addEventListener('click', () => this.handleClear());
        
        // Mode toggle
        this.modeToggle.addEventListener('click', () => this.toggleMode());
        
        // Message input
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        
        // Focus on input when page loads
        window.addEventListener('load', () => {
            this.messageInput.focus();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to send
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleSend();
            }
            
            // Ctrl/Cmd + K to clear
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.handleClear();
            }
            
            // Ctrl/Cmd + M to toggle mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                this.toggleMode();
            }
        });
    }

    async handleSend() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Disable send button and show loading
        this.setSendingState(true);
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Clear input
        this.messageInput.value = '';
        this.autoResizeTextarea();

        try {
            if (this.isAIMode) {
                await this.sendToAI(message);
            } else {
                this.addMessage('Modalità AI disattivata. Attiva la modalità AI per ricevere risposte.', 'ai');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage(`Errore: ${error.message}`, 'ai', true);
        } finally {
            this.setSendingState(false);
        }
    }

    async sendToAI(message) {
        // Show typing indicator
        const typingIndicator = this.addTypingIndicator();

        try {
            const response = await this.mistralAPI.sendMessage(message, {
                persona: this.currentPersona,
                tone: this.currentTone
            });

            // Remove typing indicator
            this.removeTypingIndicator(typingIndicator);

            // Add AI response
            this.addMessage(response.content, 'ai');

            // Update usage stats
            this.mistralAPI.updateUsageStats(response.usage);

        } catch (error) {
            this.removeTypingIndicator(typingIndicator);
            throw error;
        }
    }

    addMessage(content, sender, isError = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        const bubbleElement = document.createElement('div');
        bubbleElement.className = 'message-bubble';
        
        if (isError) {
            bubbleElement.style.borderColor = 'var(--danger)';
            bubbleElement.style.backgroundColor = 'rgba(218, 54, 51, 0.1)';
        }
        
        // Process content for links and formatting
        bubbleElement.innerHTML = this.formatMessageContent(content);
        
        messageElement.appendChild(bubbleElement);
        this.chatContainer.appendChild(messageElement);
        
        // Save to history
        const messageData = {
            content,
            sender,
            timestamp: new Date().toISOString(),
            isError
        };
        
        this.messageHistory.push(messageData);
        this.saveMessageHistory();
        
        // Scroll to bottom
        this.scrollToBottom();
        
        return messageElement;
    }

    addTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message ai typing-indicator';
        indicator.innerHTML = `
            <div class="message-bubble">
                <div class="loading">TaurosAI sta scrivendo</div>
            </div>
        `;
        
        this.chatContainer.appendChild(indicator);
        this.scrollToBottom();
        
        return indicator;
    }

    removeTypingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    formatMessageContent(content) {
        // Basic text formatting
        let formatted = content
            // Convert URLs to links
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
            // Convert newlines to br tags
            .replace(/\n/g, '<br>')
            // Bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic text
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>');
        
        return formatted;
    }

    handleClear() {
        if (this.messageHistory.length === 0) return;
        
        if (confirm('Sei sicuro di voler cancellare tutta la cronologia chat?')) {
            this.chatContainer.innerHTML = '';
            this.messageHistory = [];
            this.saveMessageHistory();
            this.messageInput.focus();
        }
    }

    toggleMode() {
        this.isAIMode = !this.isAIMode;
        this.updateModeToggle();
        
        // Show mode change message
        const modeText = this.isAIMode ? 'attivata' : 'disattivata';
        this.addMessage(`Modalità AI ${modeText}`, 'ai');
    }

    updateModeToggle() {
        if (!this.modeToggle) return;
        
        this.modeToggle.textContent = this.isAIMode ? 'AI ON' : 'AI OFF';
        this.modeToggle.classList.toggle('active', this.isAIMode);
        
        // Update send button state
        this.sendBtn.disabled = !this.isAIMode && !this.mistralAPI.hasValidApiKey();
    }

    setSendingState(isSending) {
        this.sendBtn.disabled = isSending;
        this.sendBtn.textContent = isSending ? 'Invio...' : 'Invia';
        this.messageInput.disabled = isSending;
        
        if (isSending) {
            this.sendBtn.classList.add('loading');
        } else {
            this.sendBtn.classList.remove('loading');
        }
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 150) + 'px';
    }

    scrollToBottom(smooth = true) {
        const scrollOptions = {
            top: this.chatContainer.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        };
        this.chatContainer.scrollTo(scrollOptions);
    }

    // Local Storage Management
    saveMessageHistory() {
        try {
            localStorage.setItem('tauros_message_history', JSON.stringify(this.messageHistory));
        } catch (error) {
            console.warn('Could not save message history:', error);
        }
    }

    loadMessageHistory() {
        try {
            const saved = localStorage.getItem('tauros_message_history');
            if (saved) {
                this.messageHistory = JSON.parse(saved);
                this.renderMessageHistory();
            }
        } catch (error) {
            console.warn('Could not load message history:', error);
            this.messageHistory = [];
        }
    }

    renderMessageHistory() {
        this.chatContainer.innerHTML = '';
        
        this.messageHistory.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.sender}`;
            
            const bubbleElement = document.createElement('div');
            bubbleElement.className = 'message-bubble';
            
            if (message.isError) {
                bubbleElement.style.borderColor = 'var(--danger)';
                bubbleElement.style.backgroundColor = 'rgba(218, 54, 51, 0.1)';
            }
            
            bubbleElement.innerHTML = this.formatMessageContent(message.content);
            messageElement.appendChild(bubbleElement);
            this.chatContainer.appendChild(messageElement);
        });
        
        // Scroll to bottom without animation on load
        setTimeout(() => this.scrollToBottom(false), 100);
    }

    // API Key Management
    async requestAPIKey() {
        if (!this.mistralAPI.hasValidApiKey()) {
            const apiKey = prompt(`
TaurosApp richiede una API Key di Mistral AI per funzionare.

Per ottenere la tua API Key:
1. Vai su https://console.mistral.ai/
2. Crea un account o accedi
3. Vai nella sezione API Keys
4. Genera una nuova API Key

Inserisci la tua API Key:`);
            
            if (apiKey) {
                this.mistralAPI.setApiKey(apiKey.trim());
                
                // Test the API key
                try {
                    await this.mistralAPI.testConnection();
                    this.addMessage('✅ API Key configurata correttamente!', 'ai');
                } catch (error) {
                    this.addMessage(`❌ Errore API Key: ${error.message}`, 'ai', true);
                }
            } else {
                this.addMessage('⚠️ API Key non configurata. Alcune funzionalità potrebbero non funzionare.', 'ai');
            }
        }
        
        this.updateModeToggle();
    }

    // Template and Persona Management
    setPersona(persona) {
        if (['professional', 'creative', 'analytical'].includes(persona)) {
            this.currentPersona = persona;
            this.addMessage(`Persona cambiata a: ${persona}`, 'ai');
        }
    }

    setTone(tone) {
        if (['formal', 'casual', 'friendly', 'professional', 'technical'].includes(tone)) {
            this.currentTone = tone;
            this.addMessage(`Tono cambiato a: ${tone}`, 'ai');
        }
    }

    // Advanced Features
    exportHistory() {
        const dataStr = JSON.stringify(this.messageHistory, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `tauros_chat_history_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    importHistory(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedHistory = JSON.parse(e.target.result);
                if (Array.isArray(importedHistory)) {
                    this.messageHistory = importedHistory;
                    this.saveMessageHistory();
                    this.renderMessageHistory();
                    this.addMessage('✅ Cronologia importata con successo!', 'ai');
                }
            } catch (error) {
                this.addMessage('❌ Errore nell\'importazione della cronologia', 'ai', true);
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.taurosApp = new TaurosApp();
});

// Global access
if (typeof window !== 'undefined') {
    window.TaurosApp = TaurosApp;
}