import { handleOptions, jsonError, jsonResponse } from '../_lib/cors.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { AI_PROVIDERS, AGENT_SYSTEM_PROMPTS } from '../_lib/ai-providers.js';

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
  // Try providers in order: Groq → HuggingFace → OpenRouter
  try {
    return await callGroq(messages);
  } catch (e) {
    console.warn('Groq failed, trying HuggingFace:', e.message);
  }
  try {
    return await callHuggingFace(messages);
  } catch (e) {
    console.warn('HuggingFace failed, trying OpenRouter:', e.message);
  }
  try {
    return await callOpenRouter(messages);
  } catch (e) {
    console.warn('OpenRouter failed:', e.message);
  }
  // Fallback to local responses
  return null;
}

const LOCAL_RESPONSES = {
  coach: [
    "En tant que Coach Digital, je vous guide pour maîtriser le marketing en Algérie. Facebook et Instagram sont vos meilleurs alliés. Quel domaine vous intéresse ?",
    "Le digital est en plein essor en Algérie ! Avec 20M+ utilisateurs Facebook, c'est le canal roi. Parlez-moi de votre projet.",
    "Chaque marque a une histoire à raconter. Quelle est la vôtre ? Je vous aide à la transmettre efficacement.",
  ],
  dev: [
    "Hey ! Dev Mentor ici. Frontend, backend, mobile — je vous accompagne. Qu'est-ce qu'on construit aujourd'hui ?",
    "Que vous soyez débutant ou confirmé, chaque ligne de code compte. Vous voulez apprendre quoi en premier ?",
    "Le web évolue chaque jour. Je vous apprends les bonnes pratiques actuelles, pas les techniques dépassées.",
  ],
  explorer: [
    "Bienvenue dans le futur ! L'IA n'est plus de la science-fiction. Comment puis-je vous aider à l'intégrer dans votre workflow ?",
    "L'IA est un outil, pas un remplacement. Elle amplifie votre créativité. Qu'est-ce qui vous intrigue le plus ?",
    "De ChatGPT aux algorithms de recommandation, l'IA est partout. Explorons ensemble comment l'utiliser à votre avantage.",
  ],
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Méthode non autorisée');
  }

  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const { agentId, message, history = [] } = req.body;

    if (!message || !agentId) {
      return jsonError(res, 400, 'Message et agentId requis');
    }

    const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId] || AGENT_SYSTEM_PROMPTS.coach;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    let response = await getAIResponse(messages);

    // Fallback to local if no API key configured
    if (!response) {
      const localPool = LOCAL_RESPONSES[agentId] || LOCAL_RESPONSES.coach;
      response = localPool[Math.floor(Math.random() * localPool.length)];
    }

    jsonResponse(res, 200, { response });
  } catch (err) {
    jsonError(res, 500, 'Erreur serveur: ' + err.message);
  }
}
