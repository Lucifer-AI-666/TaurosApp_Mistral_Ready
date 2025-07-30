// TaurosApp - Mistral AI Integration Module

class MistralAPI {
    constructor(apiKey = null) {
        this.apiKey = apiKey || this.getStoredApiKey();
        this.baseURL = 'https://api.mistral.ai/v1';
        this.model = 'mistral-large-latest';
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // API Key Management
    getStoredApiKey() {
        return localStorage.getItem('mistral_api_key') || '';
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('mistral_api_key', apiKey);
    }

    hasValidApiKey() {
        return this.apiKey && this.apiKey.length > 0;
    }

    // Main API Call Method
    async sendMessage(message, options = {}) {
        if (!this.hasValidApiKey()) {
            throw new Error('API Key Mistral non configurata. Inserisci la tua API key nelle impostazioni.');
        }

        const {
            persona = 'professional',
            tone = 'formal',
            template = null,
            variables = {},
            systemPrompt = null
        } = options;

        try {
            // Process message with template if specified
            let processedMessage = message;
            if (template && window.TaurosConfig) {
                const templateResult = window.TaurosConfig.TemplateProcessor.processTemplate(
                    template, 
                    { ...variables, main_content: message }, 
                    persona, 
                    tone
                );
                
                if (typeof templateResult === 'object') {
                    processedMessage = templateResult.content;
                    // Use template instructions for system prompt if not provided
                    if (!systemPrompt && templateResult.instructions) {
                        systemPrompt = this.buildSystemPrompt(persona, tone, templateResult.instructions);
                    }
                } else {
                    processedMessage = templateResult;
                }
            }

            // Build system prompt if not provided
            if (!systemPrompt) {
                systemPrompt = this.buildSystemPrompt(persona, tone);
            }

            const response = await this.makeAPIRequest({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: processedMessage
                    }
                ],
                temperature: this.getTemperatureForPersona(persona),
                max_tokens: 4000,
                top_p: 1,
                stream: false
            });

            return this.processResponse(response);

        } catch (error) {
            console.error('Mistral API Error:', error);
            throw this.handleError(error);
        }
    }

    // API Request with Retry Logic
    async makeAPIRequest(payload, attempt = 1) {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            if (attempt < this.maxRetries && this.isRetryableError(error)) {
                console.warn(`Tentativo ${attempt} fallito, riprovo in ${this.retryDelay}ms...`);
                await this.delay(this.retryDelay * attempt);
                return this.makeAPIRequest(payload, attempt + 1);
            }
            throw error;
        }
    }

    // System Prompt Builder
    buildSystemPrompt(persona, tone, additionalInstructions = '') {
        const basePrompts = {
            professional: `Sei TaurosAI Professional, un assistente AI specializzato in comunicazione professionale e business. 
                          Fornisci risposte precise, strutturate e orientate ai risultati. Usa un linguaggio professionale italiano.`,
            
            creative: `Sei TaurosAI Creative, un assistente AI specializzato in soluzioni creative e innovative. 
                      Affronta ogni richiesta con creatività e pensiero laterale, proponendo idee originali e stimolanti.`,
            
            analytical: `Sei TaurosAI Analyst, un assistente AI specializzato in analisi e ragionamento logico. 
                        Fornisci analisi dettagliate, basate su dati e metodologie strutturate.`
        };

        const toneInstructions = {
            formal: 'Usa un registro formale e linguaggio tecnico appropriato.',
            casual: 'Mantieni un tono cordiale e accessibile.',
            friendly: 'Sii cordiale e disponibile.',
            professional: 'Mantieni un approccio professionale e competente.',
            technical: 'Concentrati su aspetti tecnici e implementativi.'
        };

        let systemPrompt = basePrompts[persona] || basePrompts.professional;
        
        if (toneInstructions[tone]) {
            systemPrompt += ` ${toneInstructions[tone]}`;
        }

        if (additionalInstructions) {
            systemPrompt += ` ${additionalInstructions}`;
        }

        systemPrompt += ` Rispondi sempre in italiano a meno che non sia specificatamente richiesto diversamente.`;

        return systemPrompt;
    }

    // Response Processing
    processResponse(response) {
        if (!response.choices || response.choices.length === 0) {
            throw new Error('Risposta vuota dal server Mistral');
        }

        const message = response.choices[0].message;
        
        return {
            content: message.content,
            model: response.model,
            usage: response.usage,
            timestamp: new Date().toISOString(),
            finish_reason: response.choices[0].finish_reason
        };
    }

    // Error Handling
    handleError(error) {
        const errorMessage = error.message || 'Errore sconosciuto';
        
        // API Key errors
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            return new Error('API Key non valida. Verifica la tua chiave Mistral AI.');
        }
        
        // Rate limiting
        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            return new Error('Limite di richieste raggiunto. Riprova tra qualche minuto.');
        }
        
        // Network errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            return new Error('Errore di connessione. Verifica la tua connessione internet.');
        }
        
        // Server errors
        if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
            return new Error('Errore del server Mistral. Riprova più tardi.');
        }
        
        return new Error(`Errore Mistral AI: ${errorMessage}`);
    }

    // Utility Methods
    isRetryableError(error) {
        const retryableErrors = ['network', '429', '500', '502', '503', '504'];
        return retryableErrors.some(code => error.message.includes(code));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getTemperatureForPersona(persona) {
        const temperatures = {
            professional: 0.3,
            creative: 0.8,
            analytical: 0.2
        };
        return temperatures[persona] || 0.5;
    }

    // Configuration Methods
    async testConnection() {
        if (!this.hasValidApiKey()) {
            throw new Error('API Key non configurata');
        }

        try {
            const response = await this.makeAPIRequest({
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: 'Test connection - rispondi solo "OK"'
                    }
                ],
                max_tokens: 10
            });

            return response.choices[0].message.content.includes('OK');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Get Available Models
    async getAvailableModels() {
        if (!this.hasValidApiKey()) {
            throw new Error('API Key non configurata');
        }

        try {
            const response = await fetch(`${this.baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error('Impossibile recuperare la lista dei modelli');
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.warn('Impossibile recuperare modelli disponibili:', error);
            return [
                { id: 'mistral-large-latest', description: 'Mistral Large (Latest)' },
                { id: 'mistral-medium-latest', description: 'Mistral Medium (Latest)' },
                { id: 'mistral-small-latest', description: 'Mistral Small (Latest)' }
            ];
        }
    }

    // Usage Statistics
    getUsageStats() {
        const stats = localStorage.getItem('mistral_usage_stats');
        return stats ? JSON.parse(stats) : {
            requests: 0,
            tokens_used: 0,
            last_reset: new Date().toISOString()
        };
    }

    updateUsageStats(usage) {
        const stats = this.getUsageStats();
        stats.requests += 1;
        if (usage && usage.total_tokens) {
            stats.tokens_used += usage.total_tokens;
        }
        localStorage.setItem('mistral_usage_stats', JSON.stringify(stats));
    }
}

// Global access for browser environment
if (typeof window !== 'undefined') {
    window.MistralAPI = MistralAPI;
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MistralAPI;
}