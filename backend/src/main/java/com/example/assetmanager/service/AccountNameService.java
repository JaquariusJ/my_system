package com.example.assetmanager.service;

import com.example.assetmanager.domain.AccountName;
import com.example.assetmanager.dto.AccountNameRequest;
import com.example.assetmanager.mapper.AccountNameMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AccountNameService {
    private final AccountNameMapper accountNameMapper;

    public AccountNameService(AccountNameMapper accountNameMapper) {
        this.accountNameMapper = accountNameMapper;
    }

    public List<AccountName> findAll() {
        return accountNameMapper.findAll();
    }

    public AccountName create(AccountNameRequest request) {
        AccountName accountName = toAccountName(new AccountName(), request);
        accountNameMapper.insert(accountName);
        return accountNameMapper.findById(accountName.getId());
    }

    public AccountName update(Long id, AccountNameRequest request) {
        AccountName existing = accountNameMapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("Account name not found: " + id);
        }
        AccountName accountName = toAccountName(existing, request);
        accountName.setId(id);
        accountNameMapper.update(accountName);
        if (!existing.getName().equals(request.getName())) {
            accountNameMapper.updateAccountName(existing.getName(), request.getName());
        }
        return accountNameMapper.findById(id);
    }

    public void delete(Long id) {
        AccountName existing = accountNameMapper.findById(id);
        if (existing == null) {
            return;
        }
        if (accountNameMapper.countAccountsByName(existing.getName()) > 0) {
            throw new IllegalStateException("该账户名称已被资产记录使用，不能删除；可以先停用，或修改相关记录后再删除。");
        }
        accountNameMapper.delete(id);
    }

    private AccountName toAccountName(AccountName accountName, AccountNameRequest request) {
        accountName.setName(request.getName());
        accountName.setIdentifier(request.getIdentifier());
        accountName.setSortOrder(request.getSortOrder() == null ? 100 : request.getSortOrder());
        accountName.setRemark(request.getRemark());
        accountName.setActive(request.getActive() == null || request.getActive());
        return accountName;
    }
}
