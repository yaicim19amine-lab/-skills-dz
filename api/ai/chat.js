import { handleOptions, jsonError, jsonResponse } from '../_lib/cors.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { AI_PROVIDERS, AGENT_SYSTEM_PROMPTS } from '../_lib/ai-providers.js';
import { rateLimit, getClientIp } from '../_lib/rateLimit.js';

async function callGroq(messages) {
  const res = await fetch(AI_PROVIDERS.groq.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_PROVIDERS.groq.model,
      messages,
      max_tokens: AI_PROVIDERS.groq.maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');

  const contents = chatMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = AI_PROVIDERS.gemini.url.replace('{model}', AI_PROVIDERS.gemini.model) + `?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
      contents,
      generationConfig: {
        maxOutputTokens: AI_PROVIDERS.gemini.maxTokens,
        temperature: 0.7,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Je n'ai pas pu générer une réponse.";
}

async function callHuggingFace(messages) {
  const prompt = messages.map(m =>
    m.role === 'system' ? `<s>[INST] ${m.content}\n\n` :
    m.role === 'user' ? `[INST] ${m.content} [/INST]` :
    `${m.content}</s>`
  ).join(' ');

  const res = await fetch(AI_PROVIDERS.huggingface.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: AI_PROVIDERS.huggingface.maxTokens,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });
  if (!res.ok) throw new Error(`HuggingFace ${res.status}`);
  const data = await res.json();
  return data[0]?.generated_text || data.generated_text || "Je n'ai pas pu traiter votre question.";
}

async function callOpenRouter(messages) {
  const res = await fetch(AI_PROVIDERS.openrouter.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://skills-dz.vercel.app',
      'X-Title': 'Skills DZ',
    },
    body: JSON.stringify({
      model: AI_PROVIDERS.openrouter.model,
      messages,
      max_tokens: AI_PROVIDERS.openrouter.maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function getAIResponse(messages) {
  const providers = [
    { name: 'Groq', fn: callGroq },
    { name: 'Gemini', fn: callGemini },
    { name: 'HuggingFace', fn: callHuggingFace },
    { name: 'OpenRouter', fn: callOpenRouter },
  ];

  for (const provider of providers) {
    try {
      return await provider.fn(messages);
    } catch (e) {
      console.warn(`${provider.name} failed:`, e.message);
    }
  }
  return null;
}

const LOCAL_RESPONSES = {
  coach: [
    "Bien sûr ! En tant que Coach Digital chez Skills DZ, je suis là pour vous guider dans le marketing digital. Qu'est-ce que vous aimeriez apprendre en premier ? Réseaux sociaux, SEO, publicité Facebook ?",
    "Excellente question ! Pour percer sur le marché algérien, concentrez-vous d'abord sur Facebook et Instagram — c'est là que se trouve votre audience. Vous avez déjà une page business ?",
    "Je comprends votre défi. En Algérie, le marketing de contenu est sous-exploité — c'est votre avantage ! Commencez par publier régulièrement (3-5 fois/semaine) avec du contenu local. Voulez-vous que je vous explique comment créer un calendrier éditorial ?",
    "Pour booster vos ventes en ligne, la formule est simple : contenu engageant + publicité ciblée + WhatsApp pour les conversions. Budget conseillé pour débuter : 3000-5000 DA/mois sur Facebook. Vous voulez que je détaille chaque étape ?",
    "Le community management est la clé en Algérie. Répondez à chaque commentaire, créez des sondages, faites des live. L'algo Facebook adore l'engagement ! Skills DZ propose une formation complète là-dessus.",
    "Avec +500 diplômés et un taux de satisfaction de 95%, Skills DZ est le meilleur choix pour apprendre le marketing digital en Algérie. Nos formations combinent théorie et pratique avec gamification intégrée !",
  ],
  dev: [
    "Salut ! Dev Mentor à votre service. Que voulez-vous construire aujourd'hui ? Un site web, une app mobile, une API ? Dites-moi votre projet et on commence.",
    "Bonne question technique ! En 2026, la stack recommandée est : React/TypeScript pour le frontend, Node.js ou Python pour le backend, PostgreSQL pour la base de données. Vous voulez que je vous montre comment démarrer ?",
    "Pour débuter en développement web, je recommande : HTML/CSS → JavaScript → React → Node.js → PostgreSQL. C'est le parcours de la formation Skills DZ, et c'est le plus efficace pour être opérationnel en 3-6 mois.",
    "Le clean code, c'est pas du luxe — c'est de la survie. Une variable bien nommée vaut mieux qu'une page de commentaires. Commencez par ces règles : noms explicites, fonctions courtes, un seul rôle par fonction.",
    "Pour déployer gratuitement, utilisez Vercel (frontend + API serverless) et Supabase (base de données + auth). C'est la stack gratuite la plus puissante en 2026 pour les startups.",
    "La formation Développement Web Full Stack de Skills DZ couvre HTML, CSS, JavaScript, React, Node.js et bases de données. 12 semaines intensives pour devenir développeur全栈. Vous êtes intéressé ?",
  ],
  explorer: [
    "Bienvenue dans le monde de l'IA ! Je suis IA Explorer. Qu'est-ce qui vous intéresse ? ChatGPT, la génération d'images, l'automatisation, ou autre chose ?",
    "L'IA en 2026, c'est accessible à tous ! Voici mes recommandations gratuites : ChatGPT pour l'écriture, Claude pour l'analyse, Gemini pour la recherche, Midjourney/DALL-E pour les images. Vous voulez que je vous apprenne à les utiliser ?",
    "L'IA ne remplace pas les humains — elle les amplifie. Un bon prompt = un bon résultat. La formation IA de Skills DZ vous apprend à maîtriser ces outils pour gagner en productivité.",
    "Pour automatiser vos tâches sans code, essayez Zapier ou n8n (open source). Connectez Gmail + Sheets + WhatsApp en quelques clics. C'est l'avenir du travail en Algérie !",
    "Le machine learning, c'est plus aussi compliqué qu'avant. Vous pouvez entraîner un modèle avec Google Colab (gratuit) en quelques heures. Skills DZ propose une formation complète en IA.",
    "L'avenir appartient à ceux qui comprennent l'IA. Que vous soyez marketeur, développeur ou entrepreneur, maîtriser l'IA est devenu indispensable. Skills DZ vous forme pour être prêt.",
  ],
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Méthode non autorisée');
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`ai:${ip}`, { windowMs: 60000, max: 20 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', rl.retryAfter);
    return jsonError(res, 429, `Limite atteinte. Réessayez dans ${rl.retryAfter}s`);
  }

  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const { agentId, message, history = [] } = req.body;

    if (!message || !agentId) {
      return jsonError(res, 400, 'Message et agentId requis');
    }

    const VALID_AGENTS = ['coach', 'dev', 'explorer'];
    const safeAgentId = VALID_AGENTS.includes(agentId) ? agentId : 'coach';

    const systemPrompt = AGENT_SYSTEM_PROMPTS[safeAgentId] || AGENT_SYSTEM_PROMPTS.coach;

    const maxHistory = 10;
    const safeHistory = history.slice(-maxHistory).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: typeof h.content === 'string' ? h.content.slice(0, 2000) : '',
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...safeHistory,
      { role: 'user', content: message.slice(0, 2000) },
    ];

    let response = await getAIResponse(messages);

    if (!response) {
      const localPool = LOCAL_RESPONSES[safeAgentId] || LOCAL_RESPONSES.coach;
      response = localPool[Math.floor(Math.random() * localPool.length)];
    }

    jsonResponse(res, 200, { response });
  } catch (err) {
    jsonError(res, 500, 'Erreur serveur: ' + err.message);
  }
}
