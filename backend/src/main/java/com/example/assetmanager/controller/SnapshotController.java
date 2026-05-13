package com.example.assetmanager.controller;

import com.example.assetmanager.dto.AccountSnapshotView;
import com.example.assetmanager.dto.SnapshotRequest;
import com.example.assetmanager.dto.SummaryResponse;
import com.example.assetmanager.service.SnapshotService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/snapshots")
public class SnapshotController {
    private final SnapshotService snapshotService;

    public SnapshotController(SnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    @GetMapping
    public List<AccountSnapshotView> byMonth(@RequestParam String month) {
        return snapshotService.accountSnapshots(month);
    }

    @PostMapping
    public void save(@Valid @RequestBody SnapshotRequest request) {
        snapshotService.save(request);
    }

    @PostMapping("/batch")
    public void saveBatch(@RequestBody List<@Valid SnapshotRequest> requests) {
        snapshotService.saveBatch(requests);
    }

    @GetMapping("/months")
    public List<String> months() {
        return snapshotService.months();
    }

    @GetMapping("/summary")
    public SummaryResponse summary(@RequestParam String month) {
        return snapshotService.summary(month);
    }
}
