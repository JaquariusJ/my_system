package com.example.assetmanager.controller;

import com.example.assetmanager.domain.Account;
import com.example.assetmanager.dto.AccountRequest;
import com.example.assetmanager.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public List<Account> list(@RequestParam(defaultValue = "false") boolean activeOnly) {
        return accountService.findAll(activeOnly);
    }

    @PostMapping
    public Account create(@Valid @RequestBody AccountRequest request) {
        return accountService.create(request);
    }

    @PutMapping("/{id}")
    public Account update(@PathVariable Long id, @Valid @RequestBody AccountRequest request) {
        return accountService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        accountService.delete(id);
    }

    @GetMapping("/investment-types")
    public List<String> investmentTypes() {
        return accountService.investmentTypes();
    }
}
