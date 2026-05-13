package com.example.assetmanager;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.example.assetmanager.mapper")
public class AssetManagerApplication {
    public static void main(String[] args) {
        SpringApplication.run(AssetManagerApplication.class, args);
    }
}
