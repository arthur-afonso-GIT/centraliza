def normalizar_numero_sei(valor: str) -> str:
    """Gera uma chave tolerante para busca sem presumir o formato institucional."""
    return "".join(caractere.upper() for caractere in valor.strip() if caractere.isalnum())
