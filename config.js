// TaurosApp - Configuration and Template Processing

// Communication Templates with Dynamic Variables
const COMMUNICATION_TEMPLATES = {
    // Professional Templates
    email_formal: {
        template: `Gentile {recipient_name},

Spero che questo messaggio La trovi in buona salute. Le scrivo in merito a {subject}.

{main_content}

Rimango a disposizione per qualsiasi chiarimento e La ringrazio per l'attenzione.

Cordiali saluti,
{sender_name}`,
        variables: ['recipient_name', 'subject', 'main_content', 'sender_name'],
        tone: 'formal',
        language: 'italian'
    },
    
    email_casual: {
        template: `Ciao {recipient_name},

Come va? Ti scrivo per {subject}.

{main_content}

Fammi sapere cosa ne pensi!

A presto,
{sender_name}`,
        variables: ['recipient_name', 'subject', 'main_content', 'sender_name'],
        tone: 'casual',
        language: 'italian'
    },

    // Social Media Templates
    linkedin_post: {
        template: `🚀 {hook}

{main_content}

{call_to_action}

#TaurosApp #AI #Innovation {hashtags}`,
        variables: ['hook', 'main_content', 'call_to_action', 'hashtags'],
        tone: 'professional',
        language: 'italian'
    },

    twitter_post: {
        template: `{hook} 🧵

{main_content}

{call_to_action} {hashtags}`,
        variables: ['hook', 'main_content', 'call_to_action', 'hashtags'],
        tone: 'engaging',
        language: 'italian'
    },

    // Business Templates
    proposal: {
        template: `PROPOSTA: {project_name}

OBIETTIVO:
{objective}

APPROCCIO:
{approach}

RISULTATI ATTESI:
{expected_results}

TEMPISTICHE:
{timeline}

INVESTIMENTO:
{investment}

Disponibile per discutere i dettagli.`,
        variables: ['project_name', 'objective', 'approach', 'expected_results', 'timeline', 'investment'],
        tone: 'professional',
        language: 'italian'
    },

    // Technical Templates
    bug_report: {
        template: `🐛 BUG REPORT

DESCRIZIONE:
{description}

PASSI PER RIPRODURRE:
{steps}

COMPORTAMENTO ATTESO:
{expected_behavior}

COMPORTAMENTO ATTUALE:
{actual_behavior}

AMBIENTE:
{environment}

PRIORITÀ: {priority}`,
        variables: ['description', 'steps', 'expected_behavior', 'actual_behavior', 'environment', 'priority'],
        tone: 'technical',
        language: 'italian'
    }
};

// AI Response Personas
const AI_PERSONAS = {
    professional: {
        name: "TaurosAI Professional",
        style: "Professionale, preciso, orientato ai risultati",
        prompt_prefix: "Rispondi in modo professionale e strutturato, fornendo informazioni precise e actionable.",
        tone_modifiers: {
            formal: "Usa un registro formale e linguaggio tecnico appropriato.",
            casual: "Mantieni un tono professionale ma accessibile.",
            friendly: "Sii cordiale mantenendo la competenza professionale."
        }
    },
    
    creative: {
        name: "TaurosAI Creative",
        style: "Creativo, innovativo, pensiero laterale",
        prompt_prefix: "Affronta la richiesta con creatività e pensiero innovativo, proponendo soluzioni originali.",
        tone_modifiers: {
            inspirational: "Usa un tono motivante e visionario.",
            playful: "Mantieni un approccio giocoso ma costruttivo.",
            artistic: "Incorpora elementi artistici e estetici nella risposta."
        }
    },
    
    analytical: {
        name: "TaurosAI Analyst",
        style: "Analitico, basato sui dati, metodico",
        prompt_prefix: "Analizza la richiesta in modo metodico, fornendo dati, statistiche e ragionamento logico.",
        tone_modifiers: {
            scientific: "Usa approccio scientifico con evidenze e riferimenti.",
            strategic: "Fornisci analisi strategica con pro/contro.",
            technical: "Concentrati su aspetti tecnici e implementativi."
        }
    }
};

// Dynamic Variable Processors
const VARIABLE_PROCESSORS = {
    // Date/Time Processing
    processDateTime: (variable, format = 'default') => {
        const now = new Date();
        const formatters = {
            default: now.toLocaleDateString('it-IT'),
            full: now.toLocaleDateString('it-IT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            time: now.toLocaleTimeString('it-IT'),
            iso: now.toISOString()
        };
        return formatters[format] || formatters.default;
    },

    // User Context Processing
    processUserContext: (context) => {
        return {
            name: context.name || 'Utente',
            role: context.role || 'User',
            company: context.company || '',
            location: context.location || ''
        };
    },

    // Content Length Processing
    processContentLength: (content, maxLength = 280) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength - 3) + '...';
    },

    // Hashtag Processing
    processHashtags: (text) => {
        const words = text.toLowerCase().split(' ');
        return words
            .filter(word => word.length > 3)
            .slice(0, 5)
            .map(word => `#${word.charAt(0).toUpperCase() + word.slice(1)}`)
            .join(' ');
    }
};

// Template Processing Functions
class TemplateProcessor {
    static processTemplate(templateKey, variables = {}, persona = 'professional', tone = 'formal') {
        const template = COMMUNICATION_TEMPLATES[templateKey];
        if (!template) {
            throw new Error(`Template '${templateKey}' not found`);
        }

        let processedContent = template.template;
        
        // Process standard variables
        template.variables.forEach(variable => {
            const placeholder = `{${variable}}`;
            const value = variables[variable] || `[${variable}]`;
            processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
        });

        // Process dynamic variables
        processedContent = this.processDynamicVariables(processedContent, variables);

        // Apply persona and tone
        const personaConfig = AI_PERSONAS[persona];
        if (personaConfig && personaConfig.tone_modifiers[tone]) {
            // This would be used by the AI to adjust response style
            processedContent = {
                content: processedContent,
                persona: persona,
                tone: tone,
                instructions: personaConfig.tone_modifiers[tone]
            };
        }

        return processedContent;
    }

    static processDynamicVariables(content, variables) {
        // Process date/time variables
        content = content.replace(/{date}/g, VARIABLE_PROCESSORS.processDateTime('date'));
        content = content.replace(/{date_full}/g, VARIABLE_PROCESSORS.processDateTime('date', 'full'));
        content = content.replace(/{time}/g, VARIABLE_PROCESSORS.processDateTime('time', 'time'));

        // Process user context
        if (variables.user_context) {
            const userContext = VARIABLE_PROCESSORS.processUserContext(variables.user_context);
            Object.keys(userContext).forEach(key => {
                content = content.replace(new RegExp(`{user_${key}}`, 'g'), userContext[key]);
            });
        }

        // Process hashtags if content contains hashtag placeholder
        if (content.includes('{auto_hashtags}') && variables.main_content) {
            const hashtags = VARIABLE_PROCESSORS.processHashtags(variables.main_content);
            content = content.replace(/{auto_hashtags}/g, hashtags);
        }

        return content;
    }

    static getAvailableTemplates() {
        return Object.keys(COMMUNICATION_TEMPLATES).map(key => ({
            key,
            name: key.replace(/_/g, ' ').toUpperCase(),
            variables: COMMUNICATION_TEMPLATES[key].variables,
            tone: COMMUNICATION_TEMPLATES[key].tone,
            language: COMMUNICATION_TEMPLATES[key].language
        }));
    }

    static getAvailablePersonas() {
        return Object.keys(AI_PERSONAS).map(key => ({
            key,
            name: AI_PERSONAS[key].name,
            style: AI_PERSONAS[key].style,
            tones: Object.keys(AI_PERSONAS[key].tone_modifiers)
        }));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COMMUNICATION_TEMPLATES,
        AI_PERSONAS,
        VARIABLE_PROCESSORS,
        TemplateProcessor
    };
}

// Global access for browser environment
if (typeof window !== 'undefined') {
    window.TaurosConfig = {
        COMMUNICATION_TEMPLATES,
        AI_PERSONAS,
        VARIABLE_PROCESSORS,
        TemplateProcessor
    };
}