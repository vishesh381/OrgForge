package com.orgforge.modules.apexpulse.dto;

import java.util.List;

public record TestRunRequest(
        List<String> classIds
) {
}
