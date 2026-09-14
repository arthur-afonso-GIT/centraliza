import re
import unicodedata
from datetime import datetime

from django.utils.dateparse import parse_date

from demandas.identidade_sei import normalizar_numero_sei


ROTULOS = {
    "N SEI": "sei_numero",
    "NUMERO SEI": "sei_numero",
    "NUMERO DO PROCESSO": "sei_numero",
    "PROCESSO": "sei_numero",
    "ASSUNTO": "assunto",
    "ESPECIFICACAO": "assunto",
    "ESPECIFICACAO DESCRICAO": "assunto",
    "TIPO": "tipo_processo",
    "TIPO DO PROCESSO": "tipo_processo",
    "UNIDADE": "unidade",
    "UNIDADE GERADORA": "unidade",
    "DATA": "data_autuacao",
    "DATA DE AUTUACAO": "data_autuacao",
}


def normalizar_rotulo(valor: str) -> str:
    sem_acento = "".join(
        caractere for caractere in unicodedata.normalize("NFKD", valor)
        if not unicodedata.combining(caractere)
    )
    return re.sub(r"[^A-Z0-9]+", " ", sem_acento.upper()).strip()


def interpretar_texto_sei(texto: str) -> tuple[dict, list[str], list[str]]:
    campos: dict[str, str | None] = {
        "sei_numero": "", "assunto": "", "tipo_processo": "",
        "unidade": "", "data_autuacao": None,
    }
    avisos: list[str] = []
    erros: list[str] = []
    reconhecidos = 0
    for numero_linha, linha in enumerate(texto.splitlines(), 1):
        linha = linha.strip()
        if not linha or ":" not in linha:
            continue
        rotulo, valor = linha.split(":", 1)
        campo = ROTULOS.get(normalizar_rotulo(rotulo))
        if not campo:
            continue
        valor = valor.strip()
        if not valor:
            avisos.append(f"Linha {numero_linha}: {rotulo.strip()} está sem valor.")
            continue
        if campos[campo]:
            avisos.append(f"Linha {numero_linha}: {rotulo.strip()} repetido; o último valor foi considerado.")
        if campo == "data_autuacao":
            data = parse_date(valor)
            if data is None:
                try:
                    data = datetime.strptime(valor, "%d/%m/%Y").date()
                except ValueError:
                    erros.append(f"Linha {numero_linha}: data de autuação inválida.")
                    continue
            campos[campo] = data.isoformat()
        else:
            campos[campo] = valor
        reconhecidos += 1
    if reconhecidos == 0:
        erros.append("Nenhum campo reconhecido. Use linhas no formato 'Rótulo: valor'.")
    if not normalizar_numero_sei(str(campos["sei_numero"])):
        erros.append("O número do processo SEI não foi identificado.")
    if not campos["assunto"]:
        avisos.append("Assunto ou especificação não identificado; informe um título na confirmação.")
    return campos, avisos, erros
