package com.example.assetmanager.service;

import com.example.assetmanager.domain.InvestmentType;
import com.example.assetmanager.dto.InvestmentTypeRequest;
import com.example.assetmanager.mapper.InvestmentTypeMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InvestmentTypeService {
    private final InvestmentTypeMapper investmentTypeMapper;

    public InvestmentTypeService(InvestmentTypeMapper investmentTypeMapper) {
        this.investmentTypeMapper = investmentTypeMapper;
    }

    public List<InvestmentType> findAll() {
        return investmentTypeMapper.findAll();
    }

    public List<String> findActiveNames() {
        return investmentTypeMapper.findActiveNames();
    }

    public InvestmentType create(InvestmentTypeRequest request) {
        InvestmentType investmentType = toInvestmentType(new InvestmentType(), request);
        investmentTypeMapper.insert(investmentType);
        return investmentTypeMapper.findById(investmentType.getId());
    }

    public InvestmentType update(Long id, InvestmentTypeRequest request) {
        InvestmentType existing = investmentTypeMapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("Investment type not found: " + id);
        }
        InvestmentType investmentType = toInvestmentType(existing, request);
        investmentType.setId(id);
        investmentTypeMapper.update(investmentType);
        if (!existing.getName().equals(request.getName())) {
            investmentTypeMapper.updateAccountInvestmentType(existing.getName(), request.getName());
        }
        investmentTypeMapper.updateAccountRiskLevel(request.getName(), request.getRiskLevel() == null ? null : request.getRiskLevel().name());
        return investmentTypeMapper.findById(id);
    }

    public void delete(Long id) {
        InvestmentType existing = investmentTypeMapper.findById(id);
        if (existing == null) {
            return;
        }
        if (investmentTypeMapper.countAccountsByName(existing.getName()) > 0) {
            throw new IllegalStateException("该投资类型已被账户使用，不能删除；可以先停用，或修改相关账户后再删除。");
        }
        investmentTypeMapper.delete(id);
    }

    private InvestmentType toInvestmentType(InvestmentType investmentType, InvestmentTypeRequest request) {
        investmentType.setName(request.getName());
        investmentType.setRiskLevel(request.getRiskLevel());
        investmentType.setSortOrder(request.getSortOrder() == null ? 100 : request.getSortOrder());
        investmentType.setRemark(request.getRemark());
        investmentType.setActive(request.getActive() == null || request.getActive());
        return investmentType;
    }
}
