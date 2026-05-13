package com.example.assetmanager.dto;

import com.example.assetmanager.domain.AssetCategory;
import com.example.assetmanager.domain.RiskLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AccountRequest {
    @NotBlank
    private String name;
    private String institution;
    private String accountNoMasked;
    @NotNull
    private AssetCategory assetCategory;
    private String investmentType;
    private RiskLevel riskLevel;
    private String customFields;
    private String remark;
    private Boolean active = true;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getInstitution() {
        return institution;
    }

    public void setInstitution(String institution) {
        this.institution = institution;
    }

    public String getAccountNoMasked() {
        return accountNoMasked;
    }

    public void setAccountNoMasked(String accountNoMasked) {
        this.accountNoMasked = accountNoMasked;
    }

    public AssetCategory getAssetCategory() {
        return assetCategory;
    }

    public void setAssetCategory(AssetCategory assetCategory) {
        this.assetCategory = assetCategory;
    }

    public String getInvestmentType() {
        return investmentType;
    }

    public void setInvestmentType(String investmentType) {
        this.investmentType = investmentType;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(RiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getCustomFields() {
        return customFields;
    }

    public void setCustomFields(String customFields) {
        this.customFields = customFields;
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
