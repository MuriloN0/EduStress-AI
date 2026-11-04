package br.edu.umc.edustress;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
class StressController {
    private final StressModel model;

    StressController(StressModel model) {
        this.model = model;
    }

    @GetMapping("/modelo")
    StressModel.Metadata metadata() {
        return model.metadata();
    }

    @PostMapping("/previsoes")
    StressModel.Prediction predict(@RequestBody JsonNode body) {
        if (!body.isObject()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie um objeto JSON.");
        }
        var features = model.metadata().features();
        var errors = new LinkedHashMap<String, String>();
        var values = new int[features.size()];
        for (int i = 0; i < features.size(); i++) {
            var feature = features.get(i);
            var value = body.path(feature.key());
            if (!value.isIntegralNumber() || !value.canConvertToInt()
                    || value.intValue() < feature.min() || value.intValue() > feature.max()) {
                errors.put(feature.key(), "Informe um inteiro entre %d e %d."
                        .formatted(feature.min(), feature.max()));
            } else {
                values[i] = value.intValue();
            }
        }
        body.fieldNames().forEachRemaining(key -> {
            if (features.stream().noneMatch(feature -> feature.key().equals(key))) {
                errors.put(key, "Parâmetro desconhecido.");
            }
        });
        if (!errors.isEmpty()) {
            throw new InvalidFeatures(errors);
        }
        return model.predict(values);
    }

    @ExceptionHandler(InvalidFeatures.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String, Object> invalidFeatures(InvalidFeatures exception) {
        return Map.of("message", "Verifique os parâmetros da previsão.", "errors", exception.errors);
    }

    private static class InvalidFeatures extends RuntimeException {
        private final Map<String, String> errors;

        InvalidFeatures(Map<String, String> errors) {
            this.errors = errors;
        }
    }
}
