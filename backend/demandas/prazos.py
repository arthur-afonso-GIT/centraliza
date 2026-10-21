from datetime import date, datetime, time

from django.utils import timezone


def fim_do_dia(valor):
    """Preserva o vencimento de registros e clientes antigos sem horário."""
    if isinstance(valor, str) and len(valor) == 10:
        try:
            valor = date.fromisoformat(valor)
        except ValueError:
            return valor
    if isinstance(valor, date) and not isinstance(valor, datetime):
        return timezone.make_aware(datetime.combine(valor, time(23, 59)), timezone.get_default_timezone())
    return valor
