from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from escpos.printer import File
import serial
import threading
import time
import json
import sys

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Entrega a interface do totem pelo mesmo servidor das rotas da balança.
@app.route('/')
def pagina_inicial():
    return send_from_directory(app.root_path, 'index.html')

@app.route('/style.css')
def arquivo_css():
    return send_from_directory(app.root_path, 'style.css')

@app.route('/script_balanca.js')
def arquivo_javascript():
    return send_from_directory(app.root_path, 'script_balanca.js')

@app.route('/images/<path:nome_arquivo>')
def arquivo_imagem(nome_arquivo):
    return send_from_directory(f'{app.root_path}/images', nome_arquivo)

# Variável global para armazenar o PESO BRUTO lido da balança
peso_global = "0.000"
trava_apos_impressao = False
lock_peso = threading.Lock()

# --- FUNÇÃO DA BALANÇA (LÊ O PESO BRUTO REAL) ---
def loop_leitura_balanca():
    global peso_global, trava_apos_impressao
    print("[BALANÇA] Conectando na porta /dev/ttyUSB0 (9600bps)...", flush=True)
    
    while True:
        try:
            ser = serial.Serial('/dev/ttyUSB0', 9600, timeout=0.5, bytesize=8, parity='N', stopbits=1)
            time.sleep(0.3)
            print("[BALANÇA] Conectado! Lendo peso bruto real.", flush=True)
            
            while True:
                if ser.in_waiting > 0:
                    dados_brutos = ser.read(ser.in_waiting)
                    texto = dados_brutos.decode('utf-8', errors='ignore')
                    
                    if '\x02' in texto and '\x03' in texto:
                        blocos = texto.split('\x03')
                        for bloco in reversed(blocos):
                            if '\x02' in bloco:
                                peso_limpo = bloco.split('\x02')[-1].strip()
                                peso_numeros = ''.join(c for c in peso_limpo if c.isdigit())
                                
                                if peso_numeros and len(peso_numeros) >= 4:
                                    peso_float = float(peso_numeros)
                                    peso_bruto = peso_float / 1000
                                    with lock_peso:
                                        # Após imprimir, aguarda a retirada completa do item antes de aceitar outro peso.
                                        if trava_apos_impressao:
                                            if peso_bruto <= 0.050:
                                                trava_apos_impressao = False
                                                peso_global = f"{peso_bruto:.3f}"
                                            else:
                                                peso_global = "0.000"
                                        else:
                                            peso_global = f"{peso_bruto:.3f}"
                                    
                                    ser.reset_input_buffer()
                                    break
                time.sleep(0.1)
                
        except Exception as e:
            with lock_peso:
                peso_global = "0.000 (Erro de Conexão)"
            try: ser.close()
            except: pass
            print(f"[BALANÇA ERRO]: {e}", flush=True)
            time.sleep(2)

# Inicia a thread
thread_balanca = threading.Thread(target=loop_leitura_balanca, daemon=True)
thread_balanca.start()

# --- ROTA PARA O JAVASCRIPT PEGAR O PESO (COM TARA DINÂMICA BLINDADA) ---
@app.route('/balanca', methods=['GET'])
def obter_peso():
    global peso_global
    tipo = request.args.get('tipo', 'Almoço Kg')
    
    try:
        with lock_peso:
            peso_atual = peso_global
        peso_bruto_float = float(peso_atual)
    except:
        peso_bruto_float = 0.0

    # Lógica Blindada: converte tudo para minúsculo
    if "marmita" in tipo.lower():
        peso_final = peso_bruto_float
    else:
        peso_final = peso_bruto_float - 0.500
        if peso_final < 0: peso_final = 0.0

    return jsonify({"peso": f"{peso_final:.3f}"}), 200

# --- ROTA PARA LIMPAR O PESO ---
@app.route('/limpar_peso', methods=['POST'])
def limpar_peso():
    global peso_global, trava_apos_impressao
    with lock_peso:
        peso_global = "0.000"
        trava_apos_impressao = True
    return jsonify({"status": "sucesso"})

# --- ROTA DE IMPRESSÃO COMPLETA ---
@app.route('/imprimir', methods=['POST', 'OPTIONS'])
def imprimir_comanda():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    try:
        dados = request.json
        titulo = dados.get('titulo', 'Almoço KG')
        detalhe = dados.get('detalhe', 'Consumo Local')
        valor = dados.get('valor', 'R$ 0,00')

        p = File("/dev/usb/lp0", profile="default")
        
        # --- TOPO DA COMANDA ---
        p.set(align="center")
        p.text("         PARADA 153\n")
        p.text("      RESTAURANTE - LANCHONETE - CONVENIENCIA\n")
        
        # --- DADOS DO TOTEM ---
        p.text(f"ITEM: {titulo}\n")
        p.text(f"SELECAO: {detalhe}\n")
        p.text(f"\nVALOR DO TOTEM: {valor}\n")
        
        # --- ADICIONAIS E BEBIDAS ---
        p.set(align="left")
        p.text("\n   [ ] [ ] [ ] [ ] [ ] ALMOCO LIVRE\n")
        p.text("   [ ] [ ] [ ] [ ] [ ] ALMOCO LIVRE + CHULETA\n")
        p.text("   --------------------------------------\n")
        p.text("   [ ] [ ] [ ] AGUA MINERAL\n")
        p.text("   [ ] [ ] [ ] AGUA MINERAL 1,5L\n")
        p.text("   [ ] [ ] [ ] BRAHMA / SKOL\n")
        p.text("   [ ] [ ] [ ] HEINEKEN | [] 600ml  [] 330ml \n")
        p.text("   [ ] [ ] [ ] REFRIGERANTE 1L\n")
        p.text("   [ ] [ ] [ ] REFRIGERANTE 2L\n")
        p.text("   [ ] [ ] [ ] REFRIGERANTE 200ML\n")
        p.text("   [ ] [ ] [ ] REFRIGERANTE 600ML\n")
        p.text("   [ ] [ ] [ ] REFRIGERANTE KS\n")
        p.text("   [ ] [ ] [ ] REFRIGERANTE LATA\n")
        p.text("   [ ] [ ] [ ] SUCO 300ml\n")
        p.text("   [ ] [ ] [ ] JARRA SUCO | [] 1Lt  [] 1,5L\n")
        p.text("   [ ] [ ] [ ] TACA DE VINHO\n")
        p.text("   [ ] [ ] [ ] SUCO TIQUITO\n")
        p.text("   [ ] [ ] [ ] REFRIGERANTE H2O\n")
        p.text("   [ ] [ ] [ ] CHA GELADO\n\n")
        
        # --- RODAPÉ ---
        p.set(align="center")
        p.text("       Leve esta etiqueta ao caixa")

        p.cut() 
        p.close()

        return jsonify({"status": "impresso_com_sucesso"}), 200

    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
