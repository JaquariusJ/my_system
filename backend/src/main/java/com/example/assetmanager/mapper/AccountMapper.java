package com.example.assetmanager.mapper;

import com.example.assetmanager.domain.Account;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface AccountMapper {
    List<Account> findAll(@Param("activeOnly") boolean activeOnly);

    Account findById(@Param("id") Long id);

    void insert(Account account);

    void update(Account account);

    void delete(@Param("id") Long id);

    List<String> findInvestmentTypes();
}
