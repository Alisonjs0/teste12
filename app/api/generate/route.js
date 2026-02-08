import { NextResponse } from 'next/server';

const WEBHOOK_URL = 'https://n8n.smartcora.cloud/webhook/fd95dc0d-06c7-48ab-ab73-5a5090ffe94c';

export async function POST(request) {
  try {
    const body = await request.json();

    // Enviar para o n8n
    // Usamos fetch aqui (Node.js environment), então não tem CORS
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`n8n respondeu com status: ${response.status}`);
    }

    // Tenta pegar o JSON de resposta, se houver
    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro no proxy para n8n:', error);
    return NextResponse.json(
      { error: 'Falha ao comunicar com o gerador de relatórios.' },
      { status: 500 }
    );
  }
}
