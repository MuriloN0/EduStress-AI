import json
from pathlib import Path

from flask import Flask, request


app = Flask(__name__, static_url_path="")

MODEL_PATH = Path(__file__).resolve().parent / "model" / "forest.json"
with MODEL_PATH.open(encoding="utf-8") as file:
    forest = json.load(file)

levels = ["Baixo", "Moderado", "Alto"]
features = {feature["key"]: feature for feature in forest["features"]}
metadata = {key: value for key, value in forest.items() if key != "trees"}
metadata["levels"] = levels
metadata["globalImportance"] = sorted(
    features.values(), key=lambda feature: feature["importance"], reverse=True
)[:5]


def predict(values):
    totals = [0.0] * len(levels)
    for tree in forest["trees"]:
        node = tree[0]
        # Decision nodes contain four entries. Leaves contain the three class scores.
        while len(node) == 4:
            feature, threshold, left, right = node
            node = tree[left if values[feature] <= threshold else right]
        for index, score in enumerate(node):
            totals[index] += score

    scores = [total / len(forest["trees"]) for total in totals]
    best = max(range(len(levels)), key=scores.__getitem__)
    return {
        "stressLevel": best,
        "label": levels[best],
        "scores": scores,
        "modelVersion": forest["version"],
    }


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.get("/api/modelo")
def model_info():
    return metadata


@app.post("/api/previsoes")
def create_prediction():
    if not request.is_json:
        return {"message": "Envie o corpo como application/json."}, 415

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return {"message": "Envie um objeto JSON."}, 400

    errors = {}
    for key, feature in features.items():
        value = payload.get(key)
        minimum, maximum = feature["min"], feature["max"]
        if type(value) is not int or not minimum <= value <= maximum:
            errors[key] = f"Informe um inteiro entre {minimum} e {maximum}."
    for key in payload.keys() - features.keys():
        errors[key] = "Parâmetro desconhecido."
    if errors:
        return {"message": "Verifique os parâmetros da previsão.", "errors": errors}, 400

    return predict([payload[key] for key in features])


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080)
