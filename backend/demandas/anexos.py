from pathlib import Path

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from demandas.models import AnexoDemanda, Demanda, EventoDemanda

LIMITE_ANEXO = 10 * 1024 * 1024
TIPOS = {
    ".pdf": ("application/pdf", lambda inicio: inicio.startswith(b"%PDF-")),
    ".jpg": ("image/jpeg", lambda inicio: inicio.startswith(b"\xff\xd8\xff")),
    ".jpeg": ("image/jpeg", lambda inicio: inicio.startswith(b"\xff\xd8\xff")),
    ".png": ("image/png", lambda inicio: inicio.startswith(b"\x89PNG\r\n\x1a\n")),
}


def validar_arquivo(arquivo):
    extensao = Path(arquivo.name).suffix.lower()
    configuracao = TIPOS.get(extensao)
    if not configuracao:
        raise ValidationError({"arquivo": "Envie um arquivo PDF, JPEG ou PNG."})
    mime, assinatura_valida = configuracao
    if arquivo.size <= 0 or arquivo.size > LIMITE_ANEXO:
        raise ValidationError({"arquivo": "O arquivo deve ter até 10 MB."})
    inicio = arquivo.read(8)
    arquivo.seek(0)
    if arquivo.content_type != mime or not assinatura_valida(inicio):
        raise ValidationError({"arquivo": "O conteúdo do arquivo não corresponde ao formato informado."})
    return mime


def pode_adicionar(demanda, usuario):
    return usuario.perfil == "gestor" or (usuario.perfil == "inspetor" and demanda.responsavel_id == usuario.id)


@transaction.atomic
def adicionar_anexo(*, demanda, usuario, arquivo):
    if demanda.status in {Demanda.Status.CONCLUIDA, Demanda.Status.CANCELADA}:
        raise ValidationError({"arquivo": "Não é possível anexar arquivos a uma demanda encerrada."})
    if not pode_adicionar(demanda, usuario):
        raise PermissionDenied("Você não pode adicionar anexos a esta demanda.")
    mime = validar_arquivo(arquivo)
    anexo = AnexoDemanda.objects.create(
        demanda=demanda, arquivo=arquivo, nome_original=Path(arquivo.name).name[:255],
        mime_type=mime, tamanho=arquivo.size, autor=usuario,
    )
    EventoDemanda.objects.create(
        demanda=demanda, tipo=EventoDemanda.Tipo.ANEXO_ADICIONADO,
        autor=usuario, texto=f"Anexo adicionado: {anexo.nome_original}",
    )
    return anexo


@transaction.atomic
def remover_anexo(*, anexo, usuario):
    if usuario.perfil != "gestor" and anexo.autor_id != usuario.id:
        raise PermissionDenied("Você não pode remover este anexo.")
    anexo.removido_em = timezone.now()
    anexo.removido_por = usuario
    anexo.save(update_fields=["removido_em", "removido_por"])
    EventoDemanda.objects.create(
        demanda=anexo.demanda, tipo=EventoDemanda.Tipo.ANEXO_REMOVIDO,
        autor=usuario, texto=f"Anexo removido: {anexo.nome_original}",
    )
