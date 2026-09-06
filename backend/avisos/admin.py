from django.contrib import admin

from avisos.models import Aviso


@admin.register(Aviso)
class AvisoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "categoria", "equipe", "autor", "publicado_em")
    list_filter = ("categoria", "equipe")
    search_fields = ("titulo", "resumo", "conteudo")
