'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Copy, Check, Search, X, Loader2, Play, RefreshCw, Plus, FileText, Download } from 'lucide-react';

const WEBHOOK_URL = '/api/generate'; // Proxy local para evitar CORS e ocultar URL real

const PRESET_TERMS = {
    loja: [
        'Venda em 40 minutos', 'Dinheiro na hora', 'Aprovação de crédito imediata',
        'Sem burocracia', 'Avaliação gratuita', 'Maior variedade de carros',
        'Consignação inteligente', 'Troca com troco', 'Compra seu carro', 'Melhor preço garantido'
    ],
    anuncios: [
        'Toyota Corolla', 'Jeep Compass', 'Honda HR-V', 'Fiat Pulse',
        'Toyota Hilux', 'BMW 320i', 'Mercedes GLC', 'Volkswagen Polo',
        'Honda Civic', 'Carro 2024', 'Carro zero km', 'Financiamento disponível'
    ],
    protecao: [
        'Blindagem Nível 3A', 'Seguro total', 'Proteção contra roubo',
        'Rastreador GPS incluso', 'Garantia estendida', 'Cobertura contra colisão',
        'Assistência 24h', 'Perda total coberta', 'Vidros blindados', 'Seguro desemprego'
    ],
    locadora: [
        'Aluguel de carro por dia', 'Aluguel por semana', 'Aluguel mensal',
        'Sem taxas adicionais', 'Carro com motorista', 'Frota renovada',
        'Seguro incluído', 'Entrega a domicílio', 'Carro executivo',
        'Van para eventos', 'Promoção de aluguel', 'Desconto para PJ'
    ]
};

const ALL_TERMS = Object.values(PRESET_TERMS).flat();

export default function Home() {
    const [searchTerms, setSearchTerms] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState(null); // { type: 'success'|'error', text: '' }
    
    // Estado para armazenar dados recebidos via Webhook
    const [webhookData, setWebhookData] = useState(null);
    const lastWebhookDataRef = useRef(null);

    const wrapperRef = useRef(null);

    // Polling para verificar novos dados no webhook
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/webhook', { cache: 'no-store' });
                if (res.ok) {
                    const json = await res.json();
                    if (json.data) {
                        const dataStr = JSON.stringify(json.data);
                        if (dataStr !== lastWebhookDataRef.current) {
                            setWebhookData(json.data);
                            lastWebhookDataRef.current = dataStr;
                            
                            // Processa os dados automaticamente quando chegarem
                            processResults(json.data);
                        }
                    }
                }
            } catch (err) {
                console.error("Erro no polling do webhook:", err);
            }
        }, 2000); 

        return () => clearInterval(interval);
    }, []);

    // Função separada para processar os resultados
    const processResults = (data) => {
        let roteiros = [];

        // Lógica de normalização dos dados
        if (Array.isArray(data)) {
            roteiros = data.flatMap(item => {
                if (item.data && Array.isArray(item.data)) return item.data;
                return item;
            });
        } else if (data.data && Array.isArray(data.data)) {
            roteiros = data.data;
        } else {
            roteiros = [data];
        }

        // Filtrar vazios
        roteiros = roteiros.filter(item => item && (item.ideia_copy || item.visual || (item.json && item.json.ideia_copy)));

        if (roteiros.length > 0) {
            setResults(roteiros);
            setStatusMessage({ type: 'success', text: 'Relatório gerado e recebido com sucesso!' });
            setLoading(false); // Para o loading quando os dados chegam
            setError('');
        }
    };

    // Fechar sugestões ao clicar fora
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setSuggestions([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleInput = (e) => {
        const value = e.target.value;
        setInputValue(value);
        
        if (value.trim().length > 0) {
            const filtered = ALL_TERMS.filter(term => 
                term.toLowerCase().includes(value.toLowerCase()) && 
                !searchTerms.includes(term)
            );
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const addTerm = (term) => {
        if (term && !searchTerms.includes(term)) {
            setSearchTerms([...searchTerms, term]);
            setInputValue('');
            setSuggestions([]);
        }
    };

    const removeTerm = (termToRemove) => {
        setSearchTerms(searchTerms.filter(term => term !== termToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTerm(inputValue.trim());
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Adiciona o termo atual se houver
        let termsToSend = [...searchTerms];
        if (inputValue.trim() && !termsToSend.includes(inputValue.trim())) {
            termsToSend.push(inputValue.trim());
            setSearchTerms(termsToSend);
            setInputValue('');
        }

        if (termsToSend.length === 0) {
            setStatusMessage({ type: 'error', text: 'Adicione pelo menos um termo de busca.' });
            return;
        }

        setLoading(true);
        setError('');
        setResults(null);
        setStatusMessage(null);

        try {
            // Dispara a geração via Proxy
            await axios.post(WEBHOOK_URL, {
                searchTerms: termsToSend,
                message: termsToSend.join(', ')
            });
            
            // Não esperamos processar o resultado IMEDIATO do axios.
            // Apenas notificamos que foi enviado e deixamos o loading ativo e o polling (useEffect) pegar o resultado.
            setStatusMessage({ type: 'success', text: 'Solicitação enviada! Aguardando resposta do gerador...' });
            // O setLoading(false) NÃO é chamado aqui, pois queremos continuar esperando o Webhook

        } catch (err) {
            console.error(err);
            setError('Erro ao enviar solicitação para o servidor. Tente novamente.');
            setLoading(false); // Só para o loading se der erro no envio
        }
    };

    const clearAll = () => {
        setSearchTerms([]);
        setInputValue('');
        setResults(null);
        setError('');
        setStatusMessage(null);
    };

    const generateWordDoc = () => {
        if (!results || results.length === 0) return;

        let contentHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Relatório de Ideias</title></head>
            <body style="font-family: Arial, sans-serif;">
            <h1 style="text-align: center; color: #4F46E5;">Relatório de Ideias e Roteiros</h1>
            <p style="text-align: center; color: #666;">Gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}</p>
            <br/>
        `;

        results.forEach((item, index) => {
            const ideia = item.ideia_copy || item.json?.ideia_copy || '';
            const publico = item.publico_target || item.json?.publico_target || '';
            const visual = item.visual || item.json?.visual || '';
            const legenda = item.legenda || item.json?.legenda || '';
            const locucao = item.locucao || item.json?.locucao || '';
            const cta = item.cta_final || item.json?.cta_final || '';

            contentHtml += `
                <div style="border: 2px solid #ccc; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                    <h2 style="background-color: #EEF2FF; padding: 10px; border-radius: 4px; border-left: 5px solid #4F46E5; margin-top: 0;">Opção #${index + 1}: ${ideia.substring(0, 50)}...</h2>
                    
                    <h3 style="color: #4338CA;">💡 Ideia Central</h3>
                    <p style="background-color: #F8FAFC; padding: 10px; border-left: 4px solid #4338CA;">${ideia}</p>

                    <h3 style="color: #C2410C;">👥 Público-Alvo</h3>
                    <p style="background-color: #FFF7ED; padding: 10px; border-left: 4px solid #F97316;">${publico}</p>

                    <h3 style="color: #374151;">🎬 Roteiro</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ddd;">
                        <tr>
                            <td style="background-color: #F1F5F9; font-weight: bold; padding: 10px; width: 20%; border: 1px solid #ddd;">📹 Visual</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${visual}</td>
                        </tr>
                        <tr>
                            <td style="background-color: #F1F5F9; font-weight: bold; padding: 10px; border: 1px solid #ddd;">📝 Legenda</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${legenda}</td>
                        </tr>
                        <tr>
                            <td style="background-color: #F1F5F9; font-weight: bold; padding: 10px; border: 1px solid #ddd;">🎙️ Locução</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${locucao}</td>
                        </tr>
                    </table>

                    <div style="margin-top: 20px; padding: 15px; background-color: #3730A3; color: white; text-align: center; border-radius: 6px; font-weight: bold;">
                        🚀 CTA: ${cta}
                    </div>
                </div>
                <br/>
            `;
        });

        contentHtml += "</body></html>";

        const blob = new Blob(['\ufeff', contentHtml], {
            type: 'application/msword'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Relatorio_Roteiros_${new Date().getTime()}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <main className="min-h-screen p-4 md:p-10 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-6 md:p-10">
                
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">🎬 Gerador de Relatórios</h1>
                    <p className="text-gray-500">Gere roteiros e ideias de copy baseados em anúncios de concorrentes</p>
                </div>

                {/* Webhook Data Display - NEW */}
                {webhookData && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-8 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                                📡 Dados Recebidos via API
                            </h2>
                            <button 
                                onClick={() => { setWebhookData(null); lastWebhookDataRef.current = null; }}
                                className="text-indigo-400 hover:text-indigo-700 transition"
                                title="Limpar visualização"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-white p-4 rounded border border-indigo-100 font-mono text-sm text-gray-700 overflow-x-auto">
                            <pre>{JSON.stringify(webhookData, null, 2)}</pre>
                        </div>
                        <div className="mt-2 text-xs text-indigo-400 text-right">
                            Recebido em: {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                )}

                {/* Form Section */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
                    <form onSubmit={handleSubmit}>
                        
                        {/* Status Message */}
                        {statusMessage && (
                            <div className={`mb-4 p-4 rounded-md flex items-center gap-2 ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {statusMessage.type === 'success' ? <Check size={20} /> : <X size={20} />}
                                {statusMessage.text}
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Termos de Busca:</label>
                            
                            {/* Preset Buttons */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <PresetBtn type="loja" label="🏪 Loja de Carros" onClick={() => { setSearchTerms([...new Set([...searchTerms, ...PRESET_TERMS.loja])]); }} />
                                <PresetBtn type="anuncios" label="📢 Anúncios Automotivos" onClick={() => { setSearchTerms([...new Set([...searchTerms, ...PRESET_TERMS.anuncios])]); }} />
                                <PresetBtn type="protecao" label="🛡️ Proteções/Seguros" onClick={() => { setSearchTerms([...new Set([...searchTerms, ...PRESET_TERMS.protecao])]); }} />
                                <PresetBtn type="locadora" label="🔑 Locadoras" onClick={() => { setSearchTerms([...new Set([...searchTerms, ...PRESET_TERMS.locadora])]); }} />
                            </div>

                            {/* Input Wrapper */}
                            <div className="relative" ref={wrapperRef}>
                                <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-300 rounded-lg min-h-[50px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                                    {searchTerms.map((term, index) => (
                                        <span key={index} className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm">
                                            {term}
                                            <button type="button" onClick={() => removeTerm(term)} className="hover:bg-white/20 rounded-full p-0.5">
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                    <input 
                                        type="text" 
                                        className="flex-1 min-w-[150px] outline-none text-sm text-gray-700 placeholder-gray-400"
                                        placeholder="Digite e pressione Enter..."
                                        value={inputValue}
                                        onChange={handleInput}
                                        onKeyDown={handleKeyDown}
                                    />
                                </div>

                                {/* Autocomplete Dropdown */}
                                {suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                                        {suggestions.map((term, idx) => (
                                            <div 
                                                key={idx} 
                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 transition"
                                                onClick={() => addTerm(term)}
                                            >
                                                {term}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1 ml-1">{searchTerms.length} termo(s) adicionado(s)</div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:translate-y-[-2px] hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                                {loading ? 'Processando...' : 'Gerar Relatório'}
                            </button>
                            <button 
                                type="button" 
                                onClick={clearAll}
                                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                            >
                                <RefreshCw size={18} /> Limpar
                            </button>
                        </div>

                        {/* Loading Indicator */}
                        {loading && (
                            <div className="mt-8 text-center flex flex-col items-center animate-fade-in">
                                <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                                <p className="text-gray-600 font-medium">Processando sua solicitação com Inteligência Artificial...</p>
                                <p className="text-gray-400 text-sm mt-1">Isso pode levar alguns minutos</p>
                            </div>
                        )}
                    </form>
                </div>

                {/* Results Section */}
                {results && (
                    <div className="animate-slide-up">
                        <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-indigo-500 pb-4 mb-8 gap-4">
                            <h2 className="text-2xl font-bold text-gray-800">📊 Resultados ({results.length})</h2>
                            
                            <button 
                                onClick={generateWordDoc}
                                className="flex items-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                <Download size={18} /> Baixar Relatório (.doc)
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
                            {results.map((item, index) => (
                                <RoteiroCard key={index} item={item} number={index + 1} />
                            ))}
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mt-6 text-center">
                        <strong>Erro:</strong> {error}
                    </div>
                )}

            </div>
        </main>
    );
}

function PresetBtn({ label, onClick }) {
    return (
        <button 
            type="button" 
            onClick={onClick}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md text-xs font-medium text-gray-600 transition-colors"
        >
            {label}
        </button>
    );
}

function RoteiroCard({ item, number }) {
    const ideia = item.ideia_copy || item.json?.ideia_copy || 'Sem ideia definida';
    const publico = item.publico_target || item.json?.publico_target || 'Público não especificado';
    const visual = item.visual || item.json?.visual || 'Visual não especificado';
    const legenda = item.legenda || item.json?.legenda || 'Legenda não especificada';
    const locucao = item.locucao || item.json?.locucao || 'Locução não especificada';
    const cta = item.cta_final || item.json?.cta_final || 'CTA não especificada';

    const fullText = item.roteiro_completo || `
📌 IDEIA DE COPY:
${ideia}

👥 PÚBLICO-ALVO:
${publico}

🎬 ROTEIRO (30s)
--------------------------------
📹 VISUAL:
${visual}

📝 LEGENDA:
${legenda}

🎙️ LOCUÇÃO:
${locucao}

🚀 CTA FINAL:
${cta}
    `.trim();

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Opção #{number}
                </span>
            </div>

            <div className="p-6 space-y-6">
                
                {/* Ideia */}
                <div>
                    <h3 className="flex items-center gap-2 text-gray-800 font-bold mb-3 border-b border-indigo-50 pb-2">
                        💡 Ideia Central
                    </h3>
                    <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg text-gray-700 leading-relaxed text-sm">
                        {ideia}
                    </div>
                </div>

                {/* Público */}
                <div>
                    <h3 className="flex items-center gap-2 text-gray-800 font-bold mb-3 border-b border-indigo-50 pb-2">
                        👥 Público-Alvo
                    </h3>
                    <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg text-gray-700 leading-relaxed text-sm">
                        {publico}
                    </div>
                </div>

                {/* Roteiro Grid */}
                <div>
                    <h3 className="flex items-center gap-2 text-gray-800 font-bold mb-3 border-b border-indigo-50 pb-2">
                        🎬 Roteiro Detalhado
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden grid grid-cols-1 divide-y divide-gray-200 text-sm">
                        
                        <div className="flex flex-col sm:flex-row">
                            <div className="sm:w-32 bg-slate-50 p-4 font-semibold text-gray-600 flex flex-col items-center justify-center text-center gap-1 border-b sm:border-b-0 sm:border-r border-gray-200">
                                <span className="text-xl">📹</span> Visual
                            </div>
                            <div className="p-4 text-gray-700 flex-1">{visual}</div>
                        </div>

                        <div className="flex flex-col sm:flex-row">
                            <div className="sm:w-32 bg-slate-50 p-4 font-semibold text-gray-600 flex flex-col items-center justify-center text-center gap-1 border-b sm:border-b-0 sm:border-r border-gray-200">
                                <span className="text-xl">📝</span> Legenda
                            </div>
                            <div className="p-4 text-gray-700 flex-1">{legenda}</div>
                        </div>

                        <div className="flex flex-col sm:flex-row">
                            <div className="sm:w-32 bg-slate-50 p-4 font-semibold text-gray-600 flex flex-col items-center justify-center text-center gap-1 border-b sm:border-b-0 sm:border-r border-gray-200">
                                <span className="text-xl">🎙️</span> Locução
                            </div>
                            <div className="p-4 text-gray-700 flex-1">{locucao}</div>
                        </div>

                    </div>
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-lg text-center font-semibold shadow-md">
                    🚀 {cta}
                </div>

                {/* Action Bar */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            copied 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {copied ? (
                            <> <Check size={16} /> Copiado! </>
                        ) : (
                            <> <Copy size={16} /> Copiar Tudo </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
