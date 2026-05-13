package com.example.assetmanager.dto;

import com.example.assetmanager.domain.RiskLevel;
import jakarta.validation.constraints.NotBlank;

public class InvestmentTypeRequest {
    @NotBlank
    private String name;
    private RiskLevel riskLevel;
    private Integer sortOrder = 100;
    private String remark;
    private Boolean active = true;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(RiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
