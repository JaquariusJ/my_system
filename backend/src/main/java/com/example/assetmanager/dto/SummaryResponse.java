package com.example.assetmanager.dto;

import java.math.BigDecimal;
import java.util.List;

public class SummaryResponse {
    private String month;
    private BigDecimal totalAssets;
    private BigDecimal totalLiabilities;
    private BigDecimal netAssets;
    private List<AccountSnapshotView> accounts;

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public BigDecimal getTotalAssets() {
        return totalAssets;
    }

    public void setTotalAssets(BigDecimal totalAssets) {
        this.totalAssets = totalAssets;
    }

    public BigDecimal getTotalLiabilities() {
        return totalLiabilities;
    }

    public void setTotalLiabilities(BigDecimal totalLiabilities) {
        this.totalLiabilities = totalLiabilities;
    }

    public BigDecimal getNetAssets() {
        return netAssets;
    }

    public void setNetAssets(BigDecimal netAssets) {
        this.netAssets = netAssets;
    }

    public List<AccountSnapshotView> getAccounts() {
        return accounts;
    }

    public void setAccounts(List<AccountSnapshotView> accounts) {
        this.accounts = accounts;
    }
}
