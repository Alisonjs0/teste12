import { NextResponse } from 'next/server';

// Simulação de banco de dados em memória (limpo ao reiniciar o servidor)
let lastReceivedData = null;

export async function GET() {
  return NextResponse.json({ data: lastReceivedData });
}

export async function POST(request) {
  try {
    // Ler o corpo da requisição (JSON)
    const data = await request.json();

    console.log('Dados recebidos:', data);
    
    // Armazena os dados na variável global
    lastReceivedData = data;

    // Aqui você pode processar os dados recebidos
    // Por exemplo: salvar no banco de dados, disparar uma ação, etc.

    return NextResponse.json(
      { message: 'Post recebido com sucesso!', receivedData: data },
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
