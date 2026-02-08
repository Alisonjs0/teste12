import { NextResponse } from 'next/server';

// Armazena os últimos itens recebidos (buffer circular simples)
const MAX_ITEMS = 20;
let webhookBuffer = [];

export async function GET() {
  // Retorna o buffer completo (array de objetos)
  return NextResponse.json({ data: webhookBuffer });
}

export async function DELETE() {
  webhookBuffer = [];
  return NextResponse.json({ message: 'Buffer limpo' });
}

export async function POST(request) {
  try {
    const data = await request.json();

    console.log('Dado recebido:', data);
    
    // Adiciona ao buffer
    // Se for um array, adiciona os itens individuais
    if (Array.isArray(data)) {
        webhookBuffer.push(...data);
    } else {
        webhookBuffer.push(data);
    }

    // Mantém apenas os últimos itens para não estourar memória
    if (webhookBuffer.length > MAX_ITEMS) {
        webhookBuffer = webhookBuffer.slice(-MAX_ITEMS);
    }

    return NextResponse.json(
      { message: 'Recebido e armazenado', count: webhookBuffer.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao processar o POST:', error);
    return NextResponse.json(
      { error: 'Falha ao processar a requisição.' },
      { status: 500 }
    );
  }
}
