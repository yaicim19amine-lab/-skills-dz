/* ========================================
   SKILLS DZ — AI Agents System
   ======================================== */

const AIAgents = (() => {
  const agents = [
    {
      id: 'coach',
      name: 'Coach Digital',
      icon: '🎯',
      specialty: 'Marketing Digital & Stratégie',
      description: 'Expert en marketing digital, SEO, réseaux sociaux et stratégie de contenu pour le marché algérien.',
      personality: 'Pédagogue, encourageant, orienté résultats',
      skills: ['SEO & Référencement', 'Social Media Marketing', 'Stratégie de contenu', 'Analytics & KPI'],
      color: '#1E5BFF',
      gradient: 'linear-gradient(135deg, #1E5BFF, #00C4FF)',
      rating: 4.8,
      conversations: 1247,
      responses: {
        general: [
          "En tant que Coach Digital, je vous guide pour maîtriser le marketing en Algérie. Quel domaine vous intéresse ? 🎯",
          "Le digital est en plein essor en Algérie ! Facebook et Instagram sont vos meilleurs alliés. Parlez-moi de votre projet.",
          "Chaque marque a une histoire à raconter. Quelle est la vôtre ? Je vous aide à la transmettre efficacement."
        ],
        marketing: [
          "Pour le marché algérien, Facebook reste roi avec plus de 20M d'utilisateurs. Commencez par une page professionnelle.",
          "Le SEO en Algérie évolue vite. Utilisez des mots-clés en arabe ET en français pour couvrir les deux audiences.",
          "Le budget pub moyen en Algérie est de 5,000-15,000 DA/mois. Avec un bon ciblage, vous pouvez générer 50+ leads qualifiés."
        ],
        social: [
          "Instagram Reels est le format le plus engageant en 2025. Postez 3-4 fois par semaine entre 12h-14h et 19h-21h.",
          "TikTok explose en Algérie ! Les contenus éducatifs et humoristiques fonctionnent le mieux. Essayez les duets avec vos clients.",
          "Un bon community manager algérien doit comprendre le darija ET le français. L'authenticité est la clé !"
        ],
        seo: [
          "Le SEO local est crucial. Inscrivez-vous sur Google My Business avec les bons mots-clés wilayas + métier.",
          "La vitesse de chargement compte. Comprimez vos images (WebP) et utilisez un hébergement proche géographiquement.",
          "Les featured snippets en arabe sont encore peu concurrençables. C'est votre opportunité d'or !"
        ]
      }
    },
    {
      id: 'dev',
      name: 'Dev Mentor',
      icon: '💻',
      specialty: 'Développement Web & Mobile',
      description: 'Développeur full-stack expert en React, Node.js, PHP et applications mobiles cross-platform.',
      personality: 'Technique mais accessible, passionné, orienté code propre',
      skills: ['Frontend (React, Vue, HTML/CSS)', 'Backend (Node, PHP, Python)', 'Mobile (React Native)', 'DevOps & Déploiement'],
      color: '#00C4FF',
      gradient: 'linear-gradient(135deg, #00C4FF, #0B1331)',
      rating: 4.9,
      conversations: 2103,
      responses: {
        general: [
          "Hey ! Dev Mentor ici. Frontend, backend, mobile — je vous accompagne à chaque étape. Qu'est-ce qu'on construit aujourd'hui ? 💻",
          "Que vous soyez débutant ou confirmé, chaque ligne de compte. Vous voulez apprendre quoi en premier ?",
          "Le web évolue chaque jour. Je vous apprends les bonnes pratiques actuelles, pas les techniques dépassées."
        ],
        frontend: [
          "HTML/CSS d'abord, c'est la fondation. Ensuite, passez à JavaScript vanilla, puis React ou Vue.",
          "Flexbox et CSS Grid sont vos meilleurs amis. Oubliez Bootstrap, apprenez les grilles modernes.",
          "React avec TypeScript est le standard en 2025. Commencez par les composants fonctionnels et les hooks."
        ],
        backend: [
          "Node.js + Express pour les APIs REST. PostgreSQL comme base de données. C'est le stack le plus demandé en Algérie.",
          "L'authentification JWT est essentielle. Ne stockez jamais de mots de passe en clair — utilisez bcrypt.",
          "Docker facilite le déploiement. Apprenez les bases, ça vous sauvera des heures de debugging."
        ],
        mobile: [
          "React Native ou Flutter ? Les deux sont excellents. React Native si vous connaissez déjà React.",
          "Pour une app algérienne, pensez au mode hors-ligne et à la gestion de la connexion réseau unstable.",
          "Le publishing sur Play Store nécessite un compte développeur (25$ unique) et des screenshots en HD."
        ],
        deploy: [
          "Vercel pour le frontend, Railway ou Render pour le backend. Le déploiement en 2025 est quasi instantané.",
          "Un domaine .dz coûte environ 1,500 DA/an. Pour du .com, comptez 10-15$.",
          "CI/CD avec GitHub Actions : automatisez vos tests et déploiements. Ça vous fait gagner 10h/mois."
        ]
      }
    },
    {
      id: 'explorer',
      name: 'IA Explorer',
      icon: '🤖',
      specialty: 'Intelligence Artificielle & Innovation',
      description: 'Spécialiste en IA, machine learning, automatisation et transformation digitale.',
      personality: 'Visionnaire, curieux, orienté innovation',
      skills: ['Machine Learning', 'Automatisation', 'Prompt Engineering', 'Outils IA'],
      color: '#0B1331',
      gradient: 'linear-gradient(135deg, #0B1331, #1E5BFF)',
      rating: 4.7,
      conversations: 891,
      responses: {
        general: [
          "Bienvenue dans le futur ! 🤖 L'IA n'est plus de la science-fiction. Comment puis-je vous aider à l'intégrer dans votre workflow ?",
          "L'IA est un outil, pas un remplacement. Elle amplifie votre créativité. Qu'est-ce qui vous intrigue le plus ?",
          "De ChatGPT aux algorithms de recommandation, l'IA est partout. Explorons ensemble comment l'utiliser à votre avantage."
        ],
        ai: [
          "ChatGPT, Claude, Gemini — chaque IA a ses forces. Pour le code, Claude excelle. Pour la créativité, ChatGPT est très polyvalent.",
          "Le prompt engineering est l'art de poser les bonnes questions. Plus votre prompt est précis, meilleur est le résultat.",
          "L'IA générative (images, vidéos) évolue vite. Midjourney et RunwayML sont les outils à surveiller en 2025."
        ],
        automation: [
          "Zapier et n8n automatisent vos tâches répétitives. Connectez vos outils sans code.",
          "L'automatisation des emails avec Brevo/Mailchimp peut doubler votre productivité. Scénarios de bienvenue, panier abandonné...",
          "Les chatbots IA pour le service client réduisent de 60% la charge de travail. Votre business ne dort jamais."
        ],
        tools: [
          "Notion + IA = votre cerveau augmenté. Gestion de projets, documentation, tout est simplifié.",
          "Canva AI pour le design, Descript pour la vidéo, Otter.ai pour les transcriptions. Votre boîte à outils IA.",
          "L'API OpenAI permet d'intégrer l'IA dans vos propres applications. Commencez par les endpoints les plus simples."
        ]
      }
    }
  ];

  let currentAgent = null;
  let chatHistory = [];
  let conversationCount = 0;

  function getAgents() { return agents; }
  function getAgent(id) { return agents.find(a => a.id === id); }

  function detectIntent(message) {
    const m = message.toLowerCase();
    if (/marketing|seo|réseaux|sociaux|facebook|instagram|tiktok|pub|ciblage|conversion|funnel|content|stratégie/.test(m)) return 'marketing';
    if (/social|communauté|community|post|story|reel|abonnés|like|commentaire|influenceur/.test(m)) return 'social';
    if (/seo|référencement|google|moteur|recherche|méta|balise|ranking/.test(m)) return 'seo';
    if (/frontend|html|css|react|vue|design|responsive|ui|ux|page|site|formulaire/.test(m)) return 'frontend';
    if (/backend|api|node|php|python|base|données|sql|serveur|auth|jwt|password/.test(m)) return 'backend';
    if (/mobile|app|android|ios|react native|flutter|application/.test(m)) return 'mobile';
    if (/déploiement|deploy|vercel|hosting|domaine|dns|mise en ligne|hébergement/.test(m)) return 'deploy';
    if (/ia|intelligence artificielle|chatgpt|claude|gemini|prompt|automatisation|machine learning|deep learning/.test(m)) return 'ai';
    if (/zapier|n8n|automatiser|workflow|scénario|email|brevo|mailchimp/.test(m)) return 'automation';
    if (/outil|canva|notion|descript|logiciel|application|plateforme/.test(m)) return 'tools';
    if (/code|programmation|développer|créer|builder|construire|implémenter/.test(m)) return 'frontend';
    if (/bonjour|salut|hey|hello|coucou/.test(m)) return 'general';
    return 'general';
  }

  function getResponse(agentId, message) {
    const agent = getAgent(agentId);
    if (!agent) return "Agent non trouvé.";
    const intent = detectIntent(message);
    const responses = agent.responses[intent] || agent.responses.general;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  function startChat(agentId) {
    currentAgent = agentId;
    chatHistory = [];
    conversationCount++;
    const agent = getAgent(agentId);
    return {
      agent,
      greeting: agent.responses.general[0],
      conversationId: Date.now()
    };
  }

  function sendMessage(message) {
    if (!currentAgent) return { error: 'Aucun agent sélectionné' };
    const response = getResponse(currentAgent, message);
    chatHistory.push({ role: 'user', content: message, time: new Date() });
    chatHistory.push({ role: 'assistant', content: response, time: new Date(), agent: currentAgent });

    // Limit chat history to last 50 messages to prevent memory leak
    if (chatHistory.length > 50) {
      chatHistory = chatHistory.slice(-50);
    }

    const suggestions = getSuggestions(currentAgent);
    return { response, suggestions, history: chatHistory };
  }

  function getSuggestions(agentId) {
    const suggestions = {
      coach: ['Comment attirer des clients ?', 'Stratégie Instagram', 'SEO local Algérie', 'Budget pub optimal'],
      dev: ['Apprendre React', 'Créer une API', 'Déployer sur Vercel', 'Base de données conseillée'],
      explorer: ['Utiliser ChatGPT', 'Automatiser mes emails', 'Outils IA gratuits', 'Prompt engineering']
    };
    return suggestions[agentId] || suggestions.coach;
  }

  function renderAgentCards(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = agents.map(a => `
      <div class="agent-card" data-agent="${a.id}" style="background:#0f1117;border:1px solid #1c2035;border-radius:16px;padding:24px;cursor:pointer;transition:all .2s ease;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${a.gradient};"></div>
        <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;">
          <div style="width:56px;height:56px;border-radius:14px;background:${a.gradient};display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">${a.icon}</div>
          <div style="flex:1;">
            <h4 style="font-size:16px;font-weight:700;color:white;margin-bottom:4px;">${a.name}</h4>
            <p style="font-size:12px;color:${a.color};font-weight:600;">${a.specialty}</p>
          </div>
        </div>
        <p style="font-size:13px;color:#8892b0;line-height:1.6;margin-bottom:16px;">${a.description}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
          ${a.skills.map(s => `<span style="font-size:10px;padding:4px 10px;background:rgba(${a.color === '#1E5BFF' ? '30,91,255' : a.color === '#00C4FF' ? '0,196,255' : '11,19,49'},0.1);color:${a.color};border-radius:20px;border:1px solid ${a.color}33;">${s}</span>`).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid #1c2035;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:12px;color:#ffb547;">⭐ ${a.rating}</span>
            <span style="font-size:12px;color:#8892b0;">${a.conversations} conversations</span>
          </div>
          <button class="agent-chat-btn" data-agent="${a.id}" style="padding:8px 16px;background:${a.gradient};color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Parler →</button>
        </div>
      </div>
    `).join('');

    c.querySelectorAll('.agent-chat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openChat(btn.dataset.agent, containerId);
      });
    });

    c.querySelectorAll('.agent-card').forEach(card => {
      card.addEventListener('mouseenter', () => { card.style.borderColor = '#232840'; card.style.transform = 'translateY(-4px)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = '#1c2035'; card.style.transform = 'none'; });
    });
  }

  function openChat(agentId, containerId) {
    const { agent, greeting } = startChat(agentId);
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = `
      <div style="background:#0f1117;border:1px solid #1c2035;border-radius:16px;overflow:hidden;height:100%;display:flex;flex-direction:column;">
        <div style="padding:16px 20px;border-bottom:1px solid #1c2035;display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:10px;background:${agent.gradient};display:flex;align-items:center;justify-content:center;font-size:20px;">${agent.icon}</div>
          <div style="flex:1;">
            <h4 style="font-size:14px;font-weight:700;color:white;">${agent.name}</h4>
            <p style="font-size:11px;color:#00d68f;">● En ligne</p>
          </div>
          <button onclick="AIAgents.renderAgentCards('${containerId}')" style="background:none;border:none;color:#8892b0;cursor:pointer;font-size:18px;">✕</button>
        </div>
        <div id="chatMessages" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:32px;height:32px;border-radius:8px;background:${agent.gradient};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${agent.icon}</div>
            <div style="background:#13151e;border:1px solid #1c2035;border-radius:12px;border-top-left-radius:4px;padding:12px 16px;max-width:80%;font-size:13px;color:#e8eaf6;line-height:1.6;">${greeting}</div>
          </div>
        </div>
        <div style="padding:12px 20px;border-top:1px solid #1c2035;">
          <div id="chatSuggestions" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"></div>
          <div style="display:flex;gap:10px;">
            <input type="text" id="chatInput" placeholder="Posez votre question..." style="flex:1;padding:12px 16px;background:#13151e;border:1px solid #1c2035;border-radius:10px;color:white;font-size:13px;font-family:'Inter',sans-serif;outline:none;" />
            <button id="chatSend" style="padding:12px 20px;background:${agent.gradient};color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Envoyer</button>
          </div>
        </div>
      </div>
    `;
    renderSuggestions(getSuggestions(agentId));
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');
    const send = () => { const msg = input.value.trim(); if (msg) { addMessage(msg); input.value = ''; } };
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  function addMessage(text) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const userDiv = document.createElement('div');
    userDiv.style.cssText = 'display:flex;gap:10px;align-items:flex-start;justify-content:flex-end;';
    userDiv.innerHTML = `
      <div style="background:linear-gradient(135deg,#1E5BFF,#00C4FF);border-radius:12px;border-top-right-radius:4px;padding:12px 16px;max-width:80%;font-size:13px;color:white;line-height:1.6;">${escapeHtml(text)}</div>
    `;
    container.appendChild(userDiv);

    const { response, suggestions } = sendMessage(text);

    setTimeout(() => {
      const agent = getAgent(currentAgent);
      const aiDiv = document.createElement('div');
      aiDiv.style.cssText = 'display:flex;gap:10px;align-items:flex-start;';
      aiDiv.innerHTML = `
        <div style="width:32px;height:32px;border-radius:8px;background:${agent.gradient};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${agent.icon}</div>
        <div style="background:#13151e;border:1px solid #1c2035;border-radius:12px;border-top-left-radius:4px;padding:12px 16px;max-width:80%;font-size:13px;color:#e8eaf6;line-height:1.6;">${escapeHtml(response)}</div>
      `;
      container.appendChild(aiDiv);
      container.scrollTop = container.scrollHeight;

      if (suggestions) renderSuggestions(suggestions);
    }, 500);

    container.scrollTop = container.scrollHeight;
  }

  function renderSuggestions(suggestions) {
    const c = document.getElementById('chatSuggestions');
    if (!c) return;
    c.innerHTML = suggestions.map(s => `
      <button class="chat-suggestion" style="padding:6px 14px;background:#13151e;border:1px solid #1c2035;border-radius:20px;font-size:12px;color:#8892b0;cursor:pointer;transition:all .15s ease;">${s}</button>
    `).join('');
    c.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => { addMessage(btn.textContent); });
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#1E5BFF'; btn.style.color = '#00C4FF'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#1c2035'; btn.style.color = '#8892b0'; });
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  return {
    getAgents, getAgent, startChat, sendMessage, renderAgentCards, openChat, getResponse
  };
})();
