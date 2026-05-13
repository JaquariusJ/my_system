package com.example.assetmanager.controller;

import com.example.assetmanager.domain.AccountName;
import com.example.assetmanager.dto.AccountNameRequest;
import com.example.assetmanager.service.AccountNameService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/account-names")
public class AccountNameController {
    private final AccountNameService accountNameService;

    public AccountNameController(AccountNameService accountNameService) {
        this.accountNameService = accountNameService;
    }

    @GetMapping
    public List<AccountName> list() {
        return accountNameService.findAll();
    }

    @PostMapping
    public AccountName create(@Valid @RequestBody AccountNameRequest request) {
        return accountNameService.create(request);
    }

    @PutMapping("/{id}")
    public AccountName update(@PathVariable Long id, @Valid @RequestBody AccountNameRequest request) {
        return accountNameService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        accountNameService.delete(id);
    }
}
