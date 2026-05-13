package com.example.assetmanager.mapper;

import com.example.assetmanager.domain.AccountName;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface AccountNameMapper {
    List<AccountName> findAll();

    AccountName findById(@Param("id") Long id);

    void insert(AccountName accountName);

    void update(AccountName accountName);

    int countAccountsByName(@Param("name") String name);

    void updateAccountName(@Param("oldName") String oldName, @Param("newName") String newName);

    void delete(@Param("id") Long id);
}
