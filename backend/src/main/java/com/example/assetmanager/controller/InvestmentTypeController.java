package com.example.assetmanager.controller;

import com.example.assetmanager.domain.InvestmentType;
import com.example.assetmanager.dto.InvestmentTypeRequest;
import com.example.assetmanager.service.InvestmentTypeService;
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
@RequestMapping("/api/investment-types")
public class InvestmentTypeController {
    private final InvestmentTypeService investmentTypeService;

    public InvestmentTypeController(InvestmentTypeService investmentTypeService) {
        this.investmentTypeService = investmentTypeService;
    }

    @GetMapping
    public List<InvestmentType> list() {
        return investmentTypeService.findAll();
    }

    @PostMapping
    public InvestmentType create(@Valid @RequestBody InvestmentTypeRequest request) {
        return investmentTypeService.create(request);
    }

    @PutMapping("/{id}")
    public InvestmentType update(@PathVariable Long id, @Valid @RequestBody InvestmentTypeRequest request) {
        return investmentTypeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        investmentTypeService.delete(id);
    }
}
