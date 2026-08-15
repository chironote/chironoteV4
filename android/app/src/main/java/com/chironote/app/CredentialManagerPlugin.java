package com.chironote.app;

import android.os.CancellationSignal;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPasswordOption;
import androidx.credentials.PasswordCredential;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CredentialManager")
public class CredentialManagerPlugin extends Plugin {
    private CredentialManager credentialManager;

    @Override
    public void load() {
        credentialManager = CredentialManager.create(getContext());
    }

    @PluginMethod
    public void getPasswordCredential(PluginCall call) {
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(new GetPasswordOption())
            .build();

        credentialManager.getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse response) {
                    Credential credential = response.getCredential();

                    if (credential instanceof PasswordCredential) {
                        PasswordCredential passwordCredential = (PasswordCredential) credential;
                        JSObject result = new JSObject();
                        result.put("available", true);
                        result.put("username", passwordCredential.getId());
                        result.put("password", passwordCredential.getPassword());
                        call.resolve(result);
                        return;
                    }

                    resolveUnavailable(call);
                }

                @Override
                public void onError(@NonNull GetCredentialException exception) {
                    // No credential, user cancellation, and provider unavailability
                    // all fall back to the manual sign-in form.
                    resolveUnavailable(call);
                }
            }
        );
    }

    @PluginMethod
    public void savePasswordCredential(PluginCall call) {
        String username = call.getString("username");
        String password = call.getString("password");

        if (username == null || username.trim().isEmpty() || password == null || password.isEmpty()) {
            call.reject("A username and password are required.");
            return;
        }

        credentialManager.createCredentialAsync(
            getActivity(),
            new CreatePasswordRequest(username, password),
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                @Override
                public void onResult(CreateCredentialResponse response) {
                    JSObject result = new JSObject();
                    result.put("saved", true);
                    call.resolve(result);
                }

                @Override
                public void onError(@NonNull CreateCredentialException exception) {
                    // Saving is user-controlled and optional. A dismissed prompt or
                    // unavailable provider must not convert a valid sign-in to an error.
                    JSObject result = new JSObject();
                    result.put("saved", false);
                    call.resolve(result);
                }
            }
        );
    }

    @PluginMethod
    public void clearCredentialState(PluginCall call) {
        credentialManager.clearCredentialStateAsync(
            new ClearCredentialStateRequest(),
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override
                public void onResult(Void result) {
                    resolveCleared(call);
                }

                @Override
                public void onError(@NonNull ClearCredentialException exception) {
                    // Clearing provider session state is best-effort and never deletes
                    // a password the user saved with their password manager.
                    resolveCleared(call);
                }
            }
        );
    }

    private void resolveUnavailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", false);
        call.resolve(result);
    }

    private void resolveCleared(PluginCall call) {
        JSObject result = new JSObject();
        result.put("cleared", true);
        call.resolve(result);
    }
}
