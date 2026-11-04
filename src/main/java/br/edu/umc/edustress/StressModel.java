package br.edu.umc.edustress;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
class StressModel {
    static final List<String> LEVELS = List.of("Baixo", "Moderado", "Alto");
    private final Forest forest;
    private final Metadata metadata;

    StressModel(ObjectMapper mapper) throws IOException {
        try (var stream = new ClassPathResource("forest.json").getInputStream()) {
            forest = mapper.readValue(stream, Forest.class);
        }
        var ranking = forest.features().stream()
                .sorted(Comparator.comparingDouble(Feature::importance).reversed())
                .limit(5)
                .toList();
        metadata = new Metadata(forest.version(), forest.sklearn(), forest.features(),
                LEVELS, forest.profiles(), forest.accuracy(), forest.confusionMatrix(), ranking);
    }

    Metadata metadata() {
        return metadata;
    }

    Prediction predict(int[] values) {
        var scores = new double[LEVELS.size()];
        for (var tree : forest.trees()) {
            var node = tree[0];
            while (node.length == 4) {
                int feature = (int) node[0];
                int child = values[feature] <= node[1] ? (int) node[2] : (int) node[3];
                node = tree[child];
            }
            for (int level = 0; level < scores.length; level++) {
                scores[level] += node[level];
            }
        }
        int best = 0;
        for (int level = 0; level < scores.length; level++) {
            scores[level] /= forest.trees().length;
            if (scores[level] > scores[best]) {
                best = level;
            }
        }
        return new Prediction(best, LEVELS.get(best), scores, forest.version());
    }

    record Feature(String key, int min, int max, double importance) {}

    record Forest(String version, String sklearn, List<Feature> features,
                  List<Map<String, Integer>> profiles, double accuracy,
                  int[][] confusionMatrix, double[][][] trees) {}

    record Metadata(String version, String sklearn, List<Feature> features, List<String> levels,
                    List<Map<String, Integer>> profiles, double accuracy, int[][] confusionMatrix,
                    List<Feature> globalImportance) {}

    record Prediction(int stressLevel, String label, double[] scores, String modelVersion) {}
}
