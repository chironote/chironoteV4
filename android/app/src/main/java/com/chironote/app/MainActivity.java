package com.chironote.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_AUDIO_PERMISSION = 1001;
    private static final int REQUEST_CAMERA_PERMISSION = 1002;
    private PermissionRequest mPendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CredentialManagerPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Set custom WebChromeClient to handle permission requests properly
        // This ensures we request Android runtime permissions before granting WebView permissions
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                String[] requestedResources = request.getResources();
                
                // Check if video capture is requested
                boolean videoRequested = false;
                boolean audioRequested = false;
                
                for (String resource : requestedResources) {
                    if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        videoRequested = true;
                    }
                    if (resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        audioRequested = true;
                    }
                }
                
                // Check Android runtime permissions before granting WebView permissions
                if (audioRequested) {
                    // Check if we have RECORD_AUDIO permission
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) 
                            != PackageManager.PERMISSION_GRANTED) {
                        // Store the request to handle after permission is granted
                        mPendingPermissionRequest = request;
                        // Request Android runtime permission
                        ActivityCompat.requestPermissions(MainActivity.this, 
                            new String[]{Manifest.permission.RECORD_AUDIO}, 
                            REQUEST_AUDIO_PERMISSION);
                        return;
                    }
                }
                
                if (videoRequested) {
                    // Check if we have CAMERA permission
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) 
                            != PackageManager.PERMISSION_GRANTED) {
                        // Store the request to handle after permission is granted
                        mPendingPermissionRequest = request;
                        // Request Android runtime permission
                        ActivityCompat.requestPermissions(MainActivity.this, 
                            new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 
                            REQUEST_CAMERA_PERMISSION);
                        return;
                    }
                }
                
                // Android permissions are granted, now grant WebView permissions
                // If only audio is requested, grant only audio permission
                if (!videoRequested && audioRequested) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    // If video is requested, grant all requested resources
                    request.grant(requestedResources);
                }
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (mPendingPermissionRequest == null) {
            return;
        }
        
        boolean allGranted = true;
        for (int result : grantResults) {
            if (result != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }
        
        if (allGranted) {
            // Android permissions granted, now grant WebView permissions
            String[] requestedResources = mPendingPermissionRequest.getResources();
            
            boolean videoRequested = false;
            for (String resource : requestedResources) {
                if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                    videoRequested = true;
                    break;
                }
            }
            
            if (!videoRequested) {
                mPendingPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                mPendingPermissionRequest.grant(requestedResources);
            }
        } else {
            // User denied Android permission, deny WebView permission
            mPendingPermissionRequest.deny();
        }
        
        mPendingPermissionRequest = null;
    }
}
