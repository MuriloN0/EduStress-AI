# EduStress AI

Demonstração acadêmica do estudo da UMC sobre classificação de estresse estudantil. A API REST em Python e Flask recebe 20 fatores e executa o Random Forest exportado do treinamento do estudo. O Flask também serve o front-end em HTML, CSS e JavaScript da pasta `static/`.

## Executar a demonstração

Com Python 3.12, execute os comandos a partir desta pasta.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Abra [a demonstração local](http://127.0.0.1:8080). Se a porta 8080 estiver ocupada, use `.\.venv\Scripts\python.exe -m flask --app app run --port 8081`. Depois da instalação do Flask, a demonstração roda offline com o modelo incluído em `model/forest.json`.

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
```
