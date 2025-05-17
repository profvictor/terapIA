// Configuração da API Gemini
const GEMINI_API_KEY = "AIzaSyBoKz2uRADTSjcH9_H7ZI50sDNXB_TlBYI";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent";

// Elementos da interface
const interfaces = {
    chat: document.getElementById('chat-interface'),
    diario: document.getElementById('diario-interface'),
    sentimentos: document.getElementById('sentimentos-interface'),
    respirar: document.getElementById('respirar-interface')
};

const buttons = {
    chat: document.getElementById('chat-btn'),
    diario: document.getElementById('diario-btn'),
    sentimentos: document.getElementById('sentimentos-btn'),
    respirar: document.getElementById('respirar-btn'),
    logo: document.getElementById('logo'),
    send: document.getElementById('send-btn'),
    salvarDiario: document.getElementById('salvar-diario'),
    salvarSentimento: document.getElementById('salvar-sentimento'),
    iniciarRespiracao: document.getElementById('iniciar-respiracao'),
    toggleLeitura: document.getElementById('toggle-leitura')
};

const elementos = {
    seletorVoz: document.getElementById('seletor-voz')
};

// Estado da aplicação
let currentInterface = 'chat';
let respiracaoAtiva = false;
let timerInterval = null;
let faseRespiracao = 'inspirar';
let contadorRespiracao = 5;
let leituraAtiva = true;
let speechSynthesis = window.speechSynthesis;
let utteranceAtual = null;
let vozSelecionada = null;

// Gerenciamento de interfaces
function mostrarInterface(interface) {
    Object.values(interfaces).forEach(i => i.classList.add('hidden'));
    interfaces[interface].classList.remove('hidden');
    currentInterface = interface;
}

// Event Listeners para navegação
buttons.chat.addEventListener('click', () => mostrarInterface('chat'));
buttons.diario.addEventListener('click', () => mostrarInterface('diario'));
buttons.sentimentos.addEventListener('click', () => mostrarInterface('sentimentos'));
buttons.respirar.addEventListener('click', () => mostrarInterface('respirar'));
buttons.logo.addEventListener('click', () => mostrarInterface('chat'));

// Função para formatar a resposta do Gemini
function formatarResposta(texto) {
    // Converte markdown para HTML
    return texto
        // Converte negrito (**texto** ou __texto__)
        .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
        // Converte itálico (*texto* ou _texto_)
        .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>')
        // Converte quebras de linha
        .replace(/\n/g, '<br>')
        // Converte listas com marcadores
        .replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>')
        // Envolve listas em <ul>
        .replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>')
        // Remove espaços extras entre tags
        .replace(/>\s+</g, '><')
        // Remove espaços extras no início e fim
        .trim();
}

// Função para selecionar a voz Thalita
function selecionarVozThalita(vozes) {
    // Tenta encontrar a voz Thalita
    vozSelecionada = vozes.find(voz => 
        voz.name.includes('Thalita') || 
        voz.name.includes('Microsoft Maria') || 
        voz.name.includes('Google português')
    );

    // Se não encontrar Thalita, usa a primeira voz em português
    if (!vozSelecionada) {
        vozSelecionada = vozes.find(voz => 
            voz.lang.includes('pt') || 
            voz.lang.includes('PT')
        );
    }

    // Se ainda não encontrou, usa a primeira voz disponível
    if (!vozSelecionada && vozes.length > 0) {
        vozSelecionada = vozes[0];
    }

    console.log('Voz selecionada:', vozSelecionada ? vozSelecionada.name : 'Nenhuma voz encontrada');
}

// Função para carregar as vozes
function carregarVozes() {
    return new Promise((resolve) => {
        let vozes = speechSynthesis.getVoices();
        
        if (vozes.length > 0) {
            selecionarVozThalita(vozes);
            resolve();
        } else {
            speechSynthesis.onvoiceschanged = () => {
                vozes = speechSynthesis.getVoices();
                selecionarVozThalita(vozes);
                resolve();
            };
        }
    });
}

// Função para ler texto
function lerTexto(texto) {
    if (!leituraAtiva || !vozSelecionada) return;
    
    // Para qualquer leitura em andamento
    if (utteranceAtual) {
        speechSynthesis.cancel();
    }
    
    // Remove tags HTML e espaços extras
    const textoLimpo = texto.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    utteranceAtual = new SpeechSynthesisUtterance(textoLimpo);
    utteranceAtual.voice = vozSelecionada;
    utteranceAtual.lang = 'pt-BR';
    utteranceAtual.rate = 1.8;
    utteranceAtual.pitch = 1.0;
    
    // Quando a leitura terminar
    utteranceAtual.onend = () => {
        utteranceAtual = null;
    };
    
    speechSynthesis.speak(utteranceAtual);
}

// Toggle da leitura
buttons.toggleLeitura.addEventListener('click', () => {
    leituraAtiva = !leituraAtiva;
    
    if (leituraAtiva) {
        buttons.toggleLeitura.classList.add('ativo');
        buttons.toggleLeitura.classList.remove('desativado');
        buttons.toggleLeitura.textContent = 'volume_up';
    } else {
        buttons.toggleLeitura.classList.remove('ativo');
        buttons.toggleLeitura.classList.add('desativado');
        buttons.toggleLeitura.textContent = 'volume_off';
        // Para a leitura atual se estiver ativa
        if (utteranceAtual) {
            speechSynthesis.cancel();
            utteranceAtual = null;
        }
    }
});

// Chat com Gemini
async function enviarMensagem(mensagem) {
    const chatMessages = document.getElementById('chat-messages');
    
    // Adiciona mensagem do usuário
    const userMessage = document.createElement('div');
    userMessage.className = 'message user-message';
    userMessage.textContent = mensagem;
    chatMessages.appendChild(userMessage);

    try {
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Você é a TerapIA, uma assistente terapêutica virtual especializada em oferecer suporte emocional. Suas principais características são:

1. EMPATIA: Você sempre demonstra compreensão e empatia com os sentimentos do usuário.
2. ACOLHIMENTO: Você cria um ambiente seguro e acolhedor para o diálogo.
3. PROFISSIONALISMO: Você mantém um tom profissional, mas caloroso e acessível.
4. ORIENTAÇÃO: Você oferece insights e sugestões práticas quando apropriado.
5. LIMITES: Você reconhece quando um assunto requer ajuda profissional e sugere buscar um terapeuta.

Regras importantes:
- Sempre responda em português
- Tente dar conselhos para ajudá-lo
- Mantenha um tom acolhedor e empático
- Evite julgamentos ou críticas
- Não faça diagnósticos
- Não prescreva medicamentos
- Encoraje o usuário a buscar ajuda profissional quando necessário
- Use linguagem simples e acessível
- Faça perguntas abertas para entender melhor o contexto
- Valide os sentimentos do usuário
- Ofereça sugestões práticas quando apropriado
- Use formatação markdown para destacar pontos importantes (negrito com ** e itálico com *)

Aqui está a mensagem do usuário para você responder: ${mensagem}`
                    }]
                }]
            })
        });

        const data = await response.json();
        const resposta = data.candidates[0].content.parts[0].text;

        // Adiciona resposta da assistente com formatação
        const assistantMessage = document.createElement('div');
        assistantMessage.className = 'message assistant-message';
        assistantMessage.innerHTML = formatarResposta(resposta);
        chatMessages.appendChild(assistantMessage);

        // Lê a resposta se a leitura estiver ativa
        lerTexto(resposta);

        // Rola para a última mensagem
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message assistant-message';
        errorMessage.textContent = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
        chatMessages.appendChild(errorMessage);
    }
}

// Event listener para envio de mensagem
buttons.send.addEventListener('click', () => {
    const input = document.getElementById('user-input');
    const mensagem = input.value.trim();
    
    if (mensagem) {
        enviarMensagem(mensagem);
        input.value = '';
    }
});

document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        buttons.send.click();
    }
});

// Gerenciamento do Diário
function salvarDiario() {
    const data = document.getElementById('diario-data').value;
    const texto = document.getElementById('diario-texto').value;
    
    if (data && texto) {
        const diarios = JSON.parse(localStorage.getItem('diarios') || '{}');
        diarios[data] = texto;
        localStorage.setItem('diarios', JSON.stringify(diarios));
        
        // Removendo o alerta e mantendo o texto visível
        const mensagemSucesso = document.createElement('div');
        mensagemSucesso.className = 'mensagem-sucesso';
        mensagemSucesso.textContent = 'Diário salvo com sucesso!';
        mensagemSucesso.style.position = 'fixed';
        mensagemSucesso.style.top = '20px';
        mensagemSucesso.style.right = '20px';
        mensagemSucesso.style.backgroundColor = '#4CAF50';
        mensagemSucesso.style.color = 'white';
        mensagemSucesso.style.padding = '10px 20px';
        mensagemSucesso.style.borderRadius = '5px';
        mensagemSucesso.style.zIndex = '1000';
        document.body.appendChild(mensagemSucesso);
        
        // Remove a mensagem após 3 segundos
        setTimeout(() => {
            mensagemSucesso.remove();
        }, 3000);
    } else {
        alert('Por favor, preencha o texto do diário.');
    }
}

// Função para carregar o diário quando a data for alterada
function carregarDiario(data) {
    const diarios = JSON.parse(localStorage.getItem('diarios') || '{}');
    const texto = diarios[data] || '';
    document.getElementById('diario-texto').value = texto;
}

// Adiciona evento para mudança de data no diário
document.getElementById('diario-data').addEventListener('change', (e) => {
    carregarDiario(e.target.value);
});

buttons.salvarDiario.addEventListener('click', salvarDiario);

// Gerenciamento de Sentimentos
function salvarSentimento() {
    const data = document.getElementById('sentimento-data').value;
    const nivelSelecionado = document.querySelector('.nivel.selected');
    
    if (data && nivelSelecionado) {
        const nivel = nivelSelecionado.dataset.nivel;
        const sentimentos = JSON.parse(localStorage.getItem('sentimentos') || '{}');
        sentimentos[data] = nivel;
        localStorage.setItem('sentimentos', JSON.stringify(sentimentos));
        
        // Mensagem de sucesso similar ao diário
        const mensagemSucesso = document.createElement('div');
        mensagemSucesso.className = 'mensagem-sucesso';
        mensagemSucesso.textContent = 'Sentimento registrado com sucesso!';
        mensagemSucesso.style.position = 'fixed';
        mensagemSucesso.style.top = '20px';
        mensagemSucesso.style.right = '20px';
        mensagemSucesso.style.backgroundColor = '#4CAF50';
        mensagemSucesso.style.color = 'white';
        mensagemSucesso.style.padding = '10px 20px';
        mensagemSucesso.style.borderRadius = '5px';
        mensagemSucesso.style.zIndex = '1000';
        document.body.appendChild(mensagemSucesso);
        
        setTimeout(() => {
            mensagemSucesso.remove();
        }, 3000);
    } else {
        alert('Por favor, selecione um nível de sentimento.');
    }
}

// Função para carregar o sentimento quando a data for alterada
function carregarSentimento(data) {
    const sentimentos = JSON.parse(localStorage.getItem('sentimentos') || '{}');
    const nivel = sentimentos[data];
    
    // Remove seleção anterior
    document.querySelectorAll('.nivel').forEach(b => b.classList.remove('selected'));
    
    // Seleciona o nível salvo para a data
    if (nivel !== undefined) {
        const nivelElement = document.querySelector(`.nivel[data-nivel="${nivel}"]`);
        if (nivelElement) {
            nivelElement.classList.add('selected');
        }
    }
}

// Adiciona evento para mudança de data nos sentimentos
document.getElementById('sentimento-data').addEventListener('change', (e) => {
    carregarSentimento(e.target.value);
});

buttons.salvarSentimento.addEventListener('click', salvarSentimento);

// Seleção de nível de sentimento
document.querySelectorAll('.nivel').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.nivel').forEach(b => b.classList.remove('selected'));
        button.classList.add('selected');
    });
});

// Gerenciamento da Respiração
function iniciarRespiracao() {
    if (respiracaoAtiva) {
        pararRespiracao();
    } else {
        respiracaoAtiva = true;
        buttons.iniciarRespiracao.textContent = 'Parar';
        iniciarCicloRespiracao();
    }
}

function pararRespiracao() {
    clearInterval(timerInterval);
    respiracaoAtiva = false;
    buttons.iniciarRespiracao.textContent = 'Iniciar';
    const timerCircle = document.querySelector('.timer-circle');
    timerCircle.classList.remove('inspirando', 'segurando', 'expirando');
    timerCircle.style.transform = 'scale(1)';
    faseRespiracao = 'inspirar';
    contadorRespiracao = 5;
    atualizarTimer();
}

function iniciarCicloRespiracao() {
    const timerCircle = document.querySelector('.timer-circle');
    
    function atualizarFase() {
        timerCircle.classList.remove('inspirando', 'segurando', 'expirando');
        
        switch (faseRespiracao) {
            case 'inspirar':
                timerCircle.classList.add('inspirando');
                break;
            case 'segurar':
                timerCircle.classList.add('segurando');
                break;
            case 'expirar':
                timerCircle.classList.add('expirando');
                break;
        }
    }

    function finalizarCiclo() {
        pararRespiracao();
        // Mensagem de sucesso
        const mensagemSucesso = document.createElement('div');
        mensagemSucesso.className = 'mensagem-sucesso';
        mensagemSucesso.textContent = 'Ciclo de respiração completo! 🌟';
        mensagemSucesso.style.position = 'fixed';
        mensagemSucesso.style.top = '20px';
        mensagemSucesso.style.right = '20px';
        mensagemSucesso.style.backgroundColor = '#4CAF50';
        mensagemSucesso.style.color = 'white';
        mensagemSucesso.style.padding = '10px 20px';
        mensagemSucesso.style.borderRadius = '5px';
        mensagemSucesso.style.zIndex = '1000';
        document.body.appendChild(mensagemSucesso);
        
        setTimeout(() => {
            mensagemSucesso.remove();
        }, 3000);
    }

    timerInterval = setInterval(() => {
        if (contadorRespiracao > 0) {
            contadorRespiracao--;
            atualizarTimer();
        } else {
            switch (faseRespiracao) {
                case 'inspirar':
                    faseRespiracao = 'segurar';
                    contadorRespiracao = 3;
                    break;
                case 'segurar':
                    faseRespiracao = 'expirar';
                    contadorRespiracao = 5;
                    break;
                case 'expirar':
                    // Ao invés de voltar para inspirar, finaliza o ciclo
                    finalizarCiclo();
                    return;
            }
            atualizarFase();
            atualizarTimer();
        }
    }, 1000);

    // Inicia a primeira fase
    atualizarFase();
}

function atualizarTimer() {
    const timerFase = document.getElementById('timer-fase');
    const timerContador = document.getElementById('timer-contador');
    
    // Atualiza o texto da fase com emojis para melhor visualização
    let faseTexto = '';
    switch (faseRespiracao) {
        case 'inspirar':
            faseTexto = 'Inspire 🌬️';
            break;
        case 'segurar':
            faseTexto = 'Segure ⏸️';
            break;
        case 'expirar':
            faseTexto = 'Expire 💨';
            break;
    }
    
    timerFase.textContent = faseTexto;
    timerContador.textContent = contadorRespiracao;
}

buttons.iniciarRespiracao.addEventListener('click', iniciarRespiracao);

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Carrega as vozes disponíveis
    await carregarVozes();
    
    // Ativa a leitura por voz e atualiza o botão
    buttons.toggleLeitura.classList.add('ativo');
    buttons.toggleLeitura.classList.remove('desativado');
    buttons.toggleLeitura.textContent = 'volume_up';
    
    // Garante que apenas a interface do chat está visível inicialmente
    Object.values(interfaces).forEach(i => i.classList.add('hidden'));
    interfaces.chat.classList.remove('hidden');
    currentInterface = 'chat';

    // Define a data atual nos campos de data
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('diario-data').value = hoje;
    document.getElementById('sentimento-data').value = hoje;
    
    // Carrega dados salvos
    const diarios = JSON.parse(localStorage.getItem('diarios') || '{}');
    
    // Carrega o diário e o sentimento do dia atual
    carregarDiario(hoje);
    carregarSentimento(hoje);

    // Configuração do menu mobile
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        // Função para controlar o menu
        function toggleMenu() {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                sidebar.classList.toggle('active');
                menuToggle.classList.toggle('hidden');
            }
        }

        // Evento de clique no botão do menu
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });

        // Fecha o menu ao clicar em um item
        const menuItems = [
            buttons.chat,
            buttons.diario,
            buttons.sentimentos,
            buttons.respirar,
            buttons.logo
        ];

        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    sidebar.classList.remove('active');
                    menuToggle.classList.remove('hidden');
                }
            });
        });

        // Fecha o menu ao clicar fora
        document.addEventListener('click', (e) => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target) &&
                sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                menuToggle.classList.remove('hidden');
            }
        });

        // Ajusta o menu ao redimensionar a janela
        window.addEventListener('resize', () => {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
                sidebar.classList.remove('active');
                menuToggle.classList.add('hidden');
            } else {
                menuToggle.classList.remove('hidden');
            }
        });
    }
}); 