package com.example.assetmanager.service;

import java.time.LocalDate;
import java.time.YearMonth;

public final class MonthParser {
    private MonthParser() {
    }

    public static LocalDate parse(String month) {
        return YearMonth.parse(month).atDay(1);
    }
}
