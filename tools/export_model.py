"""Reproduce the study's training and export the forest for offline Java inference."""
import json
import sys
from pathlib import Path

import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split


def export_tree(estimator):
    tree = estimator.tree_
    nodes = []
    for index, feature in enumerate(tree.feature):
        if feature < 0:
            counts = tree.value[index, 0]
            nodes.append((counts / counts.sum()).tolist())
        else:
            nodes.append([
                int(feature), float(tree.threshold[index]),
                int(tree.children_left[index]), int(tree.children_right[index]),
            ])
    return nodes


def main(csv):
    data = pd.read_csv(csv)
    features = data.drop(columns="stress_level")
    target = data["stress_level"]
    train, test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, random_state=42, stratify=target
    )
    search = GridSearchCV(
        RandomForestClassifier(random_state=42),
        {"n_estimators": [100, 200], "max_depth": [None, 10, 20], "min_samples_split": [2, 5]},
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring="accuracy", n_jobs=4,
    ).fit(train, y_train)
    forest = search.best_estimator_
    model = {
        "version": "umc-33f530c",
        "sklearn": sklearn.__version__,
        "features": [
            {"key": key, "min": int(features[key].min()), "max": int(features[key].max()),
             "importance": float(importance)}
            for key, importance in zip(features.columns, forest.feature_importances_)
        ],
        "profiles": [
            group.median().astype(int).to_dict()
            for _, group in train.groupby(y_train)
        ],
        "accuracy": forest.score(test, y_test),
        "confusionMatrix": confusion_matrix(y_test, forest.predict(test)).tolist(),
        "trees": [export_tree(tree) for tree in forest.estimators_],
    }
    output = Path(__file__).resolve().parents[1] / "src/main/resources/forest.json"
    output.write_text(json.dumps(model, separators=(",", ":")), encoding="utf-8")
    print(search.best_params_, model["accuracy"], model["confusionMatrix"])


if __name__ == "__main__":
    main(sys.argv[1])
