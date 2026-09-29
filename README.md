# Relações Métricas Dinâmicas

Material interativo para ensinar as **relações métricas no triângulo retângulo** a partir da **semelhança de triângulos**. Feito para ser projetado em sala e aberto pelos alunos no celular.

## O que já existe

### Laboratório (Fase 1)
- Começa "cru", só com o triângulo. A barra **Mostrar** liga e desliga altura, nomes, valores, ângulos, cores, semicírculo e malha (ou **Tudo** / **Só o triângulo**).
- O olho de cada medida escolhe quais valores aparecem na figura.
- Arraste o vértice **A** sobre o semicírculo (o ângulo em A continua reto) ou o vértice **C** para mudar a hipotenusa.
- Medidas `a, b, c, h, m, n, β, γ` atualizadas ao vivo.
- Todas as relações conferidas com números em tempo real. Tocar em uma relação destaca na figura os segmentos envolvidos:
  - `c² = a·m`, `b² = a·n`, `h² = m·n`, `a·h = b·c`, `a = m + n`, `a² = b² + c²`
  - no nível EM, também `1/h² = 1/b² + 1/c²`

### Semelhança passo a passo (15 passos animados)
1. O triângulo retângulo; ângulos agudos (β + γ = 90°).
2. Altura relativa à hipotenusa, projeções `m` e `n`.
3. Descoberta dos ângulos nos triângulos menores.
4. Os triângulos são **separados** e levados à mesma posição **um movimento por passo** (espelhar o grande, girar o grande, girar o verde...), com o ângulo e o sentido de cada giro.
5. Caso AA: `△ABC ~ △HBA ~ △HAC`.
6. Os três **encaixados** pelo ângulo β, mostrando os lados paralelos.
7. Tabela de lados correspondentes e dedução de cada relação, com os lados destacados na figura e na tabela.
8. Teorema de Pitágoras como consequência.

### Deduções (Fase 2)
- Um cartão por relação: c² = a·m, b² = a·n, h² = m·n, a·h = b·c (e 1/h² = 1/b² + 1/c² no nível EM).
- Cada cartão mostra onde estão os dois triângulos, separa os dois e os alinha com **um movimento por clique** (separar, espelhar, girar...), destaca os lados correspondentes e chega à relação, conferida com os números do triângulo atual.
- Em todo o material, nenhuma transformação começa sozinha: cada uma espera o clique em **avançar**. Voltar desfaz o movimento com animação.
- O botão **Rever movimento** repete a animação do passo atual (nas Deduções e nos Exercícios).
- **Pitágoras com áreas** (demonstração de Euclides): começa só com o triângulo; cada quadrado **cresce** a partir do seu lado, um de cada vez; a altura desce e corta o quadrado maior em a·m e a·n; então cada quadrado de cateto desliza (cisalhamento), gira 90° e desliza de novo até virar um desses retângulos. A área aparece junto da figura e não muda durante os movimentos.
- Botão **▶** para reproduzir a dedução inteira sozinha.

### Exercícios e aplicações (Fase 3)
- **Decompor** (Amarelo fixo, Em pé ou Hipotenusa na base) escolhe só a posição em que os triângulos terminam na decomposição; a figura do exercício não muda.
- Com uma cena (telhado, torre, praça, escada), a figura fica **travada na posição real**: os botões de girar e espelhar ficam desativados e nenhum atalho vira a cena.
- Nas cenas, o triângulo é **desenhado aos poucos** sobre a situação; depois a cena se dissolve e os triângulos ficam exatamente no mesmo lugar antes de começarem os movimentos.
- **Contexto**: sem contexto, **Telhado** (caibros, viga e pontalete), **Torre com cabos**, **Praça** (caminho mais curto até a avenida) ou **Escada com escora**. A cena aparece desenhada, o enunciado usa as palavras da situação e o primeiro passo é encontrar o triângulo retângulo escondido nela. As medidas ficam realistas para cada situação.
- **Gerar exercício**: escolha o **foco** (as relações que devem aparecer), o número de **passos** (1 a 3) e **números inteiros ou decimais**. Opcionalmente, a figura aparece em posição aleatória.
- **Montar o meu**: marque quais medidas são dados e qual é pedida; o solucionador diz se dá para resolver.
- **Resolver por**: Semelhança, Fórmula ou As duas (padrão: primeiro a semelhança, depois a conferência pela fórmula).
- A figura começa só com os dados e o **x**. O solucionador avança um passo por clique (setas ou passador de slides):
  - quais triângulos comparar; depois a própria figura separa os dois e os alinha, **um movimento por clique**, com os dados e o x nos lados;
  - a proporção, com os lados correspondentes destacados;
  - a conta (multiplicação cruzada) e o valor encontrado, que aparece na figura.
  - Pitágoras e a soma das projeções também vão por partes: qual triângulo usar, montar e substituir, calcular;
  - na **Resposta**, os triângulos desfazem os movimentos, um de cada vez, e voltam para o lugar na figura (ou na cena), já com o valor encontrado.
- Depois que os triângulos saem da cena, a cena só volta na **Resposta** (sem ir e voltar no meio da resolução); a conferência pela fórmula continua com os triângulos alinhados.
- Botão para copiar o enunciado.

### Posição da figura
- Barra acima de cada figura para **girar** (15° por clique), **espelhar**, deixar **em pé** ou **sortear uma posição** qualquer.
- O botão **Posição padrão** fica fixo na barra de cima, em todas as abas (tecla `0`), e se destaca quando a figura está girada ou espelhada.
- No Laboratório, arrastar em qualquer ponto fora dos vértices gira a figura livremente. As medidas e as relações continuam valendo em qualquer posição.
- Na Semelhança, a figura original aparece na posição escolhida, e o botão **Comparar** define como os triângulos são alinhados:
  - **Amarelo fixo** (padrão): o amarelo fica parado e serve de referência; o grande é espelhado e girado, e o verde só é girado.
  - **Em pé**: ângulo reto embaixo, catetos na vertical e na horizontal, hipotenusa na diagonal.
  - **Hipotenusa na base**: hipotenusa horizontal, ângulo reto em cima.
- **Girar antes de espelhar**: só o triângulo grande é espelhado, porque ele é a imagem no espelho dos menores e nenhuma rotação resolve; os outros só giram. Nas comparações de dois triângulos, um deles fica parado (o amarelo, se estiver na comparação; senão, o verde).
- As reflexões são sempre numa reta **vertical ou horizontal**, fáceis de acompanhar. Os textos dos passos dizem quem espelha, quem gira (quantos graus e em que sentido) e quem fica parado.

### Copiar imagem (listas de exercícios)
- Botão **Copiar imagem** fixo na barra de cima (tecla `C`): copia a figura que está na tela como PNG, em alta resolução, com fundo branco e cores claras (mesmo no tema escuro) e recorte justo. É só colar (Ctrl+V) no Word, Google Docs ou slides.
- Nos Exercícios, no passo **Enunciado**, a imagem sai só com os dados e o x, pronta para a lista.
- Se o navegador não permitir copiar direto, abre uma janela com a imagem para copiar com o botão direito ou baixar em PNG.

### Anotar na tela (Fase 4)
- Botão **Anotar** (tecla `A`) abre uma barra com **caneta** (vermelha, azul, verde), **marca-texto**, **apontador laser** (rastro que some sozinho), **desfazer** (Ctrl+Z), **apagar tudo** e **mouse** (volta a mexer na figura sem apagar os desenhos; `Esc`).
- Cada aba tem as suas anotações, que acompanham a figura quando a janela muda de tamanho. As setas e o passador de slides continuam avançando os passos com a caneta ativa.

### Cenários salvos e QR code (Fase 4)
- No painel do professor, **Cenários salvos** guarda tudo o que está na tela (aba, triângulo, posição, camadas, passo e o exercício inteiro) com um nome, para abrir depois com um clique. Excluir pede um segundo toque. Ficam salvos no navegador.
- O **link compartilhável** agora também leva o exercício (cena, dados, pedido, método e passo).
- **Mostrar QR code para a turma** abre um QR grande com esse link, para os alunos abrirem no celular. O endereço usado é o do GitHub Pages (editável em **Endereço do site**).

### Painel do professor (botão **Professor** ou tecla `P`)
- Hipotenusa e projeção por controle deslizante ou digitadas; ou definir pelos catetos `b` e `c`.
- Exemplos prontos (15-20-25, 3-4-5, 6-8-10, 30-40-50, h = 8 exato, isósceles).
- Passo do arraste, casas decimais e unidade (cm, m).
- **Modo mistério**: esconde os valores; cada medida é revelada ao ser tocada.
- Níveis **EF** (linguagem acessível) e **EM** (mais formal).
- Tema **claro (padrão)**, escuro ou automático (segue o sistema), tamanho do texto, velocidade da animação, reprodução automática.
- **Link compartilhável**: guarda triângulo, módulo, passo e nível.

### Atalhos
| Tecla | Ação |
|---|---|
| `→` `Espaço` `PageDown` | próximo passo (funciona com passador de slides) |
| `←` `PageUp` | passo anterior |
| `L` / `S` / `D` / `X` | Laboratório / Semelhança / Deduções / Exercícios |
| `O` | ocultar ou mostrar valores |
| `N` | trocar nível EF / EM |
| `G` / `Shift+G` | girar a figura 15° |
| `E` | espelhar a figura |
| `R` | sortear uma posição |
| `0` | voltar à posição padrão |
| `F` | tela cheia |
| `C` | copiar a figura como imagem |
| `A` | anotar na tela |
| `P` | painel do professor |

## Como publicar (GitHub Pages, gratuito)

1. Junte este branch ao `main` (abra e aceite o pull request).
2. No GitHub, vá em **Settings → Pages** e em **Source** escolha **GitHub Actions**.
3. A cada envio para o `main`, o site é publicado automaticamente em
   `https://maiconcentner.github.io/relacoes_metricas_dinamica/`.

Para usar sem internet, basta abrir o `index.html` no navegador. Sem internet, as fontes são substituídas pelas do sistema.

## Estrutura

```
index.html          página única
css/style.css       visual (tema claro/escuro, responsivo)
js/core.js          estado, cálculos do triângulo, link, animação
js/draw.js          desenho em SVG (ângulos, rótulos, malha)
js/lab.js           módulo Laboratório
js/similarity.js    módulo Semelhança passo a passo (e mini-animações)
js/deductions.js    módulo Deduções (cartões e Pitágoras com áreas)
js/exercise.js      módulo Exercícios (gerador e solucionador)
js/scenes.js        cenas das aplicações (telhado, torre, praça, escada)
js/export.js        copiar a figura como imagem PNG
js/annotate.js      caneta, marca-texto e laser por cima da figura
js/share.js         link, cenários salvos e QR code
js/vendor/qrcode.js gerador de QR code (qrcode-generator, licença MIT)
js/app.js           painel do professor, atalhos, inicialização
```

Não há etapa de build: HTML, CSS e JavaScript puros. A única biblioteca (gerador de QR code) está incluída no projeto, então tudo funciona sem internet.

## Fases

As quatro fases do plano estão concluídas.
