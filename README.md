# EduStress AI

Demonstração acadêmica do estudo da UMC sobre classificação de estresse estudantil. A aplicação recebe 20 fatores e executa em Java o Random Forest treinado com a base do estudo. A página é servida pelo Spring Boot e usa HTML, CSS e JavaScript.

## Executar a demonstração

Com Java 21, rode o JAR já compilado a partir desta pasta.

```powershell
java -jar target/edustress-ai-1.0.0.jar
```

Abra [a demonstração local](http://localhost:8080). Se a porta 8080 estiver ocupada, acrescente `--server.port=8081` ao comando e abra a porta 8081. O JAR inclui o modelo e a página, portanto funciona sem internet e sem Python.

Para gerar o JAR novamente com Maven, use `mvn package`.

## Roteiro para o Summit

1. Carregue o exemplo de nível baixo e clique em **Classificar perfil**.
2. Carregue o exemplo de nível alto, classifique e compare as pontuações por classe.
3. Altere um fator, como qualidade do sono, e classifique novamente para comparar a resposta do modelo.
4. Mostre o ranking global e a acurácia de 88,64% (195 de 220 casos no conjunto de teste).

Os exemplos são perfis fictícios formados pelas medianas por classe no conjunto de treino. O ranking mostra a importância global dos fatores calculada pelo Random Forest. A demonstração tem finalidade acadêmica.

## API REST

| Método e rota | Resposta |
| --- | --- |
| `GET /api/modelo` | Campos, intervalos, perfis fictícios, classes, acurácia, matriz de confusão e ranking global |
| `POST /api/previsoes` | Classe prevista, rótulo, pontuação por classe e versão do modelo |

Envie os 20 campos como inteiros em um objeto JSON. A API retorna HTTP 400 e indica os campos inválidos, ausentes ou desconhecidos. Para alterar o conjunto de fatores usados pelo classificador, é preciso treinar e exportar novamente o modelo com o novo esquema.

```powershell
$base = 'http://localhost:8080'
$modelo = Invoke-RestMethod "$base/api/modelo"
$perfil = $modelo.profiles[2]
$perfil.sleep_quality = 3
Invoke-RestMethod "$base/api/previsoes" -Method Post -ContentType 'application/json' -Body ($perfil | ConvertTo-Json)
```

As pontuações seguem a ordem baixo, moderado e alto. A aplicação processa a previsão em memória.

## Origem do modelo

O treinamento segue o notebook do [EduStress AI no commit 33f530c](https://github.com/rayanelbarbosa/EduStress_AI/tree/33f530c), com divisão estratificada 80/20, semente 42 e GridSearchCV com cinco partições. O treinamento encontrou 100 árvores, profundidade máxima 10 e mínimo de duas amostras para dividir um nó.

Para reproduzir a exportação, instale Python com pandas 2.3.3 e scikit-learn 1.9.1 e aponte para o CSV do repositório do estudo.

```powershell
python tools/export_model.py 'caminho/para/StressLevelDataset.csv'
mvn package
```
