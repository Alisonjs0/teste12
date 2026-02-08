import { NextResponse } from 'next/server';

// Buffer circular simples em memória volátil
const MAX_ITEMS = 50;
let webhookBuffer = [];

export async function GET() {
  // Retorna tudo o que esta instância tem na memória
  return NextResponse.json({ 
    data: webhookBuffer,
    // Debug: ver qual server respondeu
    instance: Math.random().toString(36).substring(7) 
  });
}

export async function DELETE() {
  webhookBuffer = [];
  return NextResponse.json({ message: 'Buffer limpo nesta instância' });
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Recebido:', typeof data);

    let itemsToAdd = [];

    // Normaliza a entrada para garantir que é um array de roteiros
    if (Array.isArray(data)) {
        itemsToAdd = data;
    } else {
        itemsToAdd = [data];
    }

    // Estratégia de Acumulação: Sempre adiciona ao fim.
    // Nunca substituímos os dados, para evitar perder informações se o frontend demorar a buscar.
    webhookBuffer.push(...itemsToAdd);

    // Limite de segurança (FIFO - remove os mais antigos se passar do limite)
    if (webhookBuffer.length > MAX_ITEMS) {
        webhookBuffer = webhookBuffer.slice(-MAX_ITEMS);
    }

    return NextResponse.json(
      { 
        message: 'Recebido com sucesso', 
        count: webhookBuffer.length 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro no Webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
