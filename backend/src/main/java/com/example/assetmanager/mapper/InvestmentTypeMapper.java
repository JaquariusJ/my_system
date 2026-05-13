package com.example.assetmanager.mapper;

import com.example.assetmanager.domain.InvestmentType;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface InvestmentTypeMapper {
    List<InvestmentType> findAll();

    List<String> findActiveNames();

    InvestmentType findById(@Param("id") Long id);

    void insert(InvestmentType investmentType);

    void update(InvestmentType investmentType);

    int countAccountsByName(@Param("name") String name);

    void updateAccountInvestmentType(@Param("oldName") String oldName, @Param("newName") String newName);

    void updateAccountRiskLevel(@Param("investmentType") String investmentType, @Param("riskLevel") String riskLevel);

    void delete(@Param("id") Long id);
}
