// --- VARIÁVEIS DE CONTROLE DO SISTEMA ---
let pesoBrutoBalança = "0.000";
let opcaoSelecionada = "";
let precoPorQuilo = 0.00;
let erroConexaoBalanca = false;

// VARIÁVEL DE TARA DINÂMICA
let taraAtual = 0.000; 

// Elementos do HTML mapeados
const telaSelecao = document.getElementById('tela-selecao');
const telaLivreOpcoes = document.getElementById('tela-livre-opcoes');
const telaPesagem = document.getElementById('tela-pesagem');
const telaFinal = document.getElementById('tela-final');
const btnVoltar = document.getElementById('btn-voltar');

// --- 1. LOOP DE LEITURA DA BALANÇA (Roda a cada 500ms) ---
function lerBalancaContinua() {
    // ALTERAÇÃO: Usando caminho relativo '/balanca' em vez do IP fixo
    const url = `/balanca?tipo=${encodeURIComponent(opcaoSelecionada || 'Almoço Kg')}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("Flask Offline");
            return response.json();
        })
        .then(data => {
            erroConexaoBalanca = data.peso.includes("Erro");
            // Salva o peso retornado pelo Python (Que já vem tratado dinamicamente)
            pesoBrutoBalança = erroConexaoBalanca ? "0.000" : data.peso;
            
            // Se estiver na tela de pesagem, atualiza o display gigante na tela do cliente
            if (!telaPesagem.classList.contains('hidden')) {
                atualizarTelaPesagemDinamica();
            }
        })
        .catch(err => {
            console.log("Aguardando servidor Python...", err.message);
            pesoBrutoBalança = "0.000";
        });
}
setInterval(lerBalancaContinua, 500);

// --- 2. GERENCIAMENTO DE TELAS E CLIQUES (Baseado no seu HTML) ---
document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
        const acionamento = card.getAttribute('data-action');
        
        // Pega as informações de preço e nome direto dos atributos "data-" do seu HTML
        opcaoSelecionada = card.getAttribute('data-opcao') || "";
        precoPorQuilo = parseFloat(card.getAttribute('data-preco')) || 0.00;

        // REGRA DE TARA E PREÇO DINÂMICO DA MARMITA
        if (opcaoSelecionada.toLowerCase().includes("marmita")) {
            taraAtual = 0.000;       // Sem desconto de prato para marmita
            precoPorQuilo = 45.00;   // Garante o novo preço de R$ 45,00/kg
        } else {
            taraAtual = 0.500;       // Almoço a KG padrão aplica desconto de 500g do prato
        }

        if (acionamento === "submenu-livre") {
            // Abre a tela de opções de Almoço Livre
            trocarTela(telaLivreOpcoes);
        } 
        else if (acionamento === "pesar") {
            // Vai para a tela de pesagem por KG (Almoço ou Marmita)
            configurarTelaPesagem();
            trocarTela(telaPesagem);
            
            // Inicia uma verificação: quando a balança estabilizar com peso, avança sozinho
            aguardarEstabilizacaoBalanca();
        } 
        else if (acionamento === "final-fixo") {
            // Almoço Livre (Preço Fixo) - Vai direto para o recibo, sem pesar
            processarVendaFixa(opcaoSelecionada, precoPorQuilo);
        }
    });
});

// Botão Voltar do Header
btnVoltar.addEventListener('click', () => {
    if (!telaLivreOpcoes.classList.contains('hidden') || !telaPesagem.classList.contains('hidden')) {
        trocarTela(telaSelecao);
    }
});

// --- 3. LÓGICAS FLUXO DE PESAGEM ---

function configurarTelaPesagem() {
    document.getElementById('txt-card-titulo').innerText = opcaoSelecionada;
    document.getElementById('txt-card-sub').innerText = `Preço do Quilo: R$ ${precoPorQuilo.toFixed(2).replace('.', ',')}`;
    
    // Configura a imagem do topo da pesagem baseando-se na escolha
    const imgTopo = document.getElementById('img-pesagem-topo');
    if (opcaoSelecionada.toLowerCase().includes("marmita")) {
        imgTopo.innerHTML = '<img src="images/Marmita.png" alt="Marmita">';
    } else {
        imgTopo.innerHTML = '<img src="images/kg.png" alt="Almoço KG">';
    }
}

function atualizarTelaPesagemDinamica() {
    const displayPeso = document.getElementById('display-peso-gigante');
    const statusTitulo = document.getElementById('status-titulo');
    const taraAviso = document.getElementById('tara-informativo');
    
    let pesoExibidoNum = parseFloat(pesoBrutoBalança);

    if (erroConexaoBalanca) {
        statusTitulo.innerText = "Balança desconectada!";
        displayPeso.classList.add('hidden');
        taraAviso.classList.add('hidden');
        return;
    }

    // Define o limite mínimo de exibição. Se o Python já retornou o peso com tara, o valor líquido vai aparecer aqui diretamente.
    if (pesoExibidoNum > 0.010) {
        displayPeso.classList.remove('hidden');
        taraAviso.classList.remove('hidden');
        displayPeso.innerText = pesoExibidoNum.toFixed(3).replace('.', ',') + " Kg";
        statusTitulo.innerText = "Calculando valor...";

        // Atualiza a legenda de aviso baseando-se na tara configurada localmente no clique
        if (taraAtual > 0) {
            taraAviso.innerText = "* Desconto de 500g do prato aplicado *";
        } else {
            taraAviso.innerText = "* Pesagem direta sem desconto de prato *";
        }
    } else {
        displayPeso.classList.add('hidden');
        taraAviso.classList.add('hidden');
        
        if (opcaoSelecionada.toLowerCase().includes("marmita")) {
            statusTitulo.innerText = "Coloque a marmita na balança";
        } else {
            statusTitulo.innerText = "Coloque o prato na balança";
        }
    }
}

function aguardarEstabilizacaoBalanca() {
    let segundosEstabilizado = 0;
    
    const checagemEstavel = setInterval(() => {
        let pesoExibidoNum = parseFloat(pesoBrutoBalança);
        
        if (telaPesagem.classList.contains('hidden')) {
            clearInterval(checagemEstavel);
            return;
        }

        // Como o Flask já desconta a tara quando enviamos o tipo "Almoço Kg", o peso aqui já é o líquido estável.
        // Qualquer peso líquido acima de 40g já inicia a contagem de estabilização.
        if (pesoExibidoNum > 0.040) { 
            segundosEstabilizado++;
            if (segundosEstabilizado >= 4) { // Cerca de 2 segundos de estabilidade contínua
                clearInterval(checagemEstavel);
                finalizarEImprimirPesagem(pesoExibidoNum);
            }
        } else {
            segundosEstabilizado = 0; // Reseta se o recipiente for retirado antes do tempo
        }
    }, 500);
}

// --- 4. CÁLCULOS FINAIS E ENVIO PARA MDK-080 ---

function finalizarEImprimirPesagem(pesoFinal) {
    // MATEMÁTICA: O peso retornado já está com a tara tratada pelo back-end
    let valorCalculado = pesoFinal * precoPorQuilo;
    
    // FORMATANDO O VALOR EM DINHEIRO COM DESTAQUE VISUAL
    let valorNumeroString = valorCalculado.toFixed(2).replace('.', ',');
    let valorFormatadoHTML = `
        <span class="prefixo-moeda" style="font-size: 0.55em; font-weight: 600; opacity: 0.7; margin-right: 8px;">R$</span>
        <span class="valor-numero">${valorNumeroString}</span>
    `;
    
    let pesoGramas = Math.round(pesoFinal * 1000) + "g";

    // Atualiza os dados da Tela de Recibo Final do seu HTML
    document.getElementById('txt-recibo-valor').innerHTML = valorFormatadoHTML;
    document.getElementById('txt-recibo-detalhe').innerText = `${pesoGramas} • ${opcaoSelecionada}`;
    document.getElementById('img-recibo-final').innerHTML = document.getElementById('img-pesagem-topo').innerHTML;

    trocarTela(telaFinal);

    // Envia o payload de impressão puro como texto formatado para o Python
    let valorEmDinheiroPuro = valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    dispararImpressaoServidor(opcaoSelecionada, `Consumo (${pesoGramas})`, valorEmDinheiroPuro);
}

function processarVendaFixa(nomeOpcao, precoFixo) {
    // FORMATANDO O VALOR FIXO EM DINHEIRO COM DESTAQUE VISUAL
    let valorNumeroString = precoFixo.toFixed(2).replace('.', ',');
    let valorFormatadoHTML = `
        <span class="prefixo-moeda" style="font-size: 0.55em; font-weight: 600; opacity: 0.7; margin-right: 8px;">R$</span>
        <span class="valor-numero">${valorNumeroString}</span>
    `;
    
    document.getElementById('txt-recibo-valor').innerHTML = valorFormatadoHTML;
    document.getElementById('txt-recibo-detalhe').innerText = `Preço Fixo • ${nomeOpcao}`;
    
    document.getElementById('img-recibo-final').innerHTML = '<img src="images/Chuleta.png" alt="Livre">';

    trocarTela(telaFinal);

    let valorEmDinheiroPuro = precoFixo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    dispararImpressaoServidor(nomeOpcao, "Almoço Livre", valorEmDinheiroPuro);
}

function dispararImpressaoServidor(titulo, detalhe, valor) {
    // A limpeza é solicitada após a confirmação da impressão para não perder a leitura usada no recibo.
    fetch('/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, detalhe, valor })
    })
    .then(res => res.json())
    .then(dados => {
        if (dados.status === "impresso_com_sucesso") {
            pesoBrutoBalança = "0.000";
            return fetch('/limpar_peso', { method: 'POST' })
                .then(res => {
                    if (!res.ok) throw new Error("Falha ao limpar o peso no servidor");
                    document.getElementById('txt-impressao').innerText = "Comprovante Impresso!";
                });
        }
        throw new Error(dados.mensagem || "Falha ao imprimir comprovante");
    })
    .then(() => {
        setTimeout(() => {
            trocarTela(telaSelecao);
        }, 1500);
    })
    .catch(err => {
        console.error("Erro no fluxo de impressão/limpeza:", err);
        document.getElementById('txt-impressao').innerText = "Erro ao imprimir ou limpar peso.";
        setTimeout(() => {
            trocarTela(telaSelecao);
        }, 1500);
    });
}

// --- 5. FUNÇÃO AUXILIAR DE NAVEGAÇÃO ---
function trocarTela(telaAlvo) {
    telaSelecao.classList.add('hidden');
    telaLivreOpcoes.classList.add('hidden');
    telaPesagem.classList.add('hidden');
    telaFinal.classList.add('hidden');

    telaAlvo.classList.remove('hidden'); 

    if (telaAlvo === telaSelecao || telaAlvo === telaFinal) {
        btnVoltar.classList.add('hidden');
    } else {
        btnVoltar.classList.remove('hidden');
    }

    if (telaAlvo === telaSelecao) {
        document.getElementById('txt-impressao').innerText = "Imprimindo Comprovante...";
        
        pesoBrutoBalança = "0.000";
        opcaoSelecionada = "";
        precoPorQuilo = 0.00;
        taraAtual = 0.000;
    }
}
