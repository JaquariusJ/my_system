package com.example.assetmanager.service;

import com.example.assetmanager.domain.Account;
import com.example.assetmanager.domain.AssetCategory;
import com.example.assetmanager.domain.RiskLevel;
import com.example.assetmanager.dto.AccountRequest;
import com.example.assetmanager.mapper.AccountMapper;
import com.example.assetmanager.mapper.InvestmentTypeMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AccountService {
    private final AccountMapper accountMapper;
    private final InvestmentTypeMapper investmentTypeMapper;

    public AccountService(AccountMapper accountMapper, InvestmentTypeMapper investmentTypeMapper) {
        this.accountMapper = accountMapper;
        this.investmentTypeMapper = investmentTypeMapper;
    }

    public List<Account> findAll(boolean activeOnly) {
        return accountMapper.findAll(activeOnly);
    }

    public Account create(AccountRequest request) {
        Account account = toAccount(new Account(), request);
        accountMapper.insert(account);
        return accountMapper.findById(account.getId());
    }

    public Account update(Long id, AccountRequest request) {
        Account existing = accountMapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("Account not found: " + id);
        }
        Account account = toAccount(existing, request);
        account.setId(id);
        accountMapper.update(account);
        return accountMapper.findById(id);
    }

    public void delete(Long id) {
        accountMapper.delete(id);
    }

    public List<String> investmentTypes() {
        return accountMapper.findInvestmentTypes();
    }

    private Account toAccount(Account account, AccountRequest request) {
        NormalizedAccountFields normalizedFields = normalizeAccountFields(request);
        account.setName(request.getName());
        account.setInstitution(request.getInstitution());
        account.setAccountNoMasked(request.getAccountNoMasked());
        account.setAssetCategory(request.getAssetCategory());
        account.setInvestmentType(normalizedFields.investmentType());
        account.setRiskLevel(normalizedFields.riskLevel());
        account.setCustomFields(blankToNull(request.getCustomFields()));
        account.setRemark(request.getRemark());
        account.setActive(request.getActive() == null || request.getActive());
        return account;
    }

    private NormalizedAccountFields normalizeAccountFields(AccountRequest request) {
        if (request.getAssetCategory() == AssetCategory.LIABILITY) {
            return new NormalizedAccountFields(null, null);
        }

        String investmentType = blankToNull(request.getInvestmentType());
        if (investmentType == null) {
            throw new IllegalArgumentException("Asset accounts require an investment type");
        }
        var type = investmentTypeMapper.findByName(investmentType);
        if (type == null) {
            throw new IllegalArgumentException("Investment type not found: " + investmentType);
        }
        RiskLevel riskLevel = type.getRiskLevel();
        if (riskLevel == null) {
            throw new IllegalArgumentException("The selected investment type has no risk level configured");
        }
        return new NormalizedAccountFields(investmentType, riskLevel);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private record NormalizedAccountFields(String investmentType, RiskLevel riskLevel) {
    }
}
