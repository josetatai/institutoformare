# Biblioteca Formare: registro de decisões e situação

Complementa o documento `Projeto_Biblioteca_Formare_v2.0_Banca.md` (versão 2.0, 27/11/2026), que foi guardado sem alterações.
Este registro reúne o que o proponente confirmou ou decidiu depois, e a situação da implementação. Não é parecer jurídico nem auditoria.

## Confirmações do proponente (28/11/2026)

| Ponto do projeto v2.0 | Decisão |
|---|---|
| Base inicial de compradores | **Cerca de 70 compradores** (confirmado). A área de membros da Kiwify mostra 40 alunos, que não é o total de compradores. |
| Piloto (item 12 do projeto) | Em vez de importar a base atual, **começar do zero com o próximo produto a lançar**. Os produtos atuais entram aos poucos, como **cópia em novo estilo** (flipbook), sem mexer na Kiwify existente. Até a migração, quem compra continua recebendo o e-book pela Kiwify. |
| "Ambiente permanente" | O ambiente é permanente, o acesso ao conteúdo **não é vitalício**: **12 meses por título** a partir da compra aprovada, com **liberação programada** por produto, igual à da Kiwify. |
| Importação dos compradores antigos | Adiada. Será feita no fim de semana escolhido pelo proponente, com reconciliação prévia. |

## Decisões de produto já implementadas

- **Plataforma de pagamento:** Kiwify (checkout, pagamento, order bump). A biblioteca recebe os avisos por webhook autenticado e não processa pagamentos.
- **Liberação automática por produto**, **desligada por padrão**: só o produto com a chave ligada entra na biblioteca (conta + e-mail de acesso). Os avisos dos demais ficam guardados e podem ser reprocessados.
- **PDF disponível** em cada título, com chave "Mostrar botão Baixar PDF" no painel, além do flipbook.
- **Marca d'água do PDF e do flipbook:** e-mail + código curto da licença, na diagonal, grande e clara. **CPF não é usado** (minimização de dados, LGPD). O código também fica gravado no arquivo e cada download é registrado. A proteção é parcial: inibe e permite rastrear, não impede todas as cópias.
- **Aviso de transparência** sobre a marca d'água na janela do livro e em "Minha conta". Ainda falta o texto nos Termos de Uso da biblioteca, com conferência jurídica.
- **Títulos anteriores ocultados** em 27/11/2026 (não apagados), para começar a biblioteca zerada. Voltam com a opção "Publicado" no painel.
- **Cenários financeiros (seção 6):** as contas foram conferidas e batem com as fórmulas do documento.

## Situação da implementação frente à tabela de funcionalidades (28/11/2026)

**Pronto:** integração Kiwify (assinatura conferida, eventos guardados, reprocessamento, pagamento pendente não libera), cadastro e recuperação de senha, acesso por título com prazo e liberação programada, flipbook com "continuar de onde parou", PDF com marca d'água e anexos Word/Excel, catálogo bloqueado com "Ver o que contém" e "Adquirir", painel administrativo, arquivos em pasta privada.

**Parcial:**
- Reembolso: hoje bloqueia o pedido inteiro, não só o item reembolsado. Depende de uma compra real com order bump para ver como a Kiwify avisa.
- Métricas: guardam último acesso, página lida e downloads. Faltam clique no checkout e visita a produto bloqueado.
- Desconto de 10%: o botão "Adquirir" leva ao checkout; o desconto precisa ser configurado na Kiwify (recurso citado no projeto) e testado com order bump.

**Falta:** amostra das primeiras páginas dos bloqueados; filtros Todos / Meus livros / Explorar e busca; "Próximos lançamentos" com "Avise-me" e consentimento; e-mails de relacionamento com descadastro; histórico de versões; link seguro de acesso; importação dos compradores antigos.

## Ordem combinada para os próximos passos

1. Amostra dos bloqueados, filtros com busca e "Próximos lançamentos / Avise-me" (**em andamento**).
2. Métricas básicas de uso e compra.
3. E-mails de relacionamento, após definir base legal, preferências e descadastro.
4. Importação dos compradores antigos, por último.

Antes do primeiro cliente real do produto novo: compra de teste para confirmar o e-mail de boas-vindas, o order bump e o reembolso.
