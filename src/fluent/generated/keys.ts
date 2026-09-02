import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    'app.css': {
                        table: 'sys_ux_theme_asset'
                        id: 'e7f6a82f45c44b0e83b51bdcd54b8f6d'
                    }
                    bom_json: {
                        table: 'sys_module'
                        id: 'e572fa89cb7a4f54b27e9b42fe501e4e'
                    }
                    'event-batch-finished': {
                        table: 'sysevent_register'
                        id: '9583d22ef32f4997b6973135fd991c5e'
                    }
                    'event-updates-ready': {
                        table: 'sysevent_register'
                        id: '4493f6417ca64097a158cc1d1c76b50c'
                    }
                    'job-check-store-updates': {
                        table: 'sysauto_script'
                        id: 'f16d3fb26fbf4f649fd8086ca2691a72'
                    }
                    'job-notify-batch-finished': {
                        table: 'sysauto_script'
                        id: '96e8aab81e8e4c48a3c7f2eacb83e47e'
                    }
                    'job-notify-updates-available': {
                        table: 'sysauto_script'
                        id: 'c2a1198aa86e4037963d9ef494aa86fe'
                    }
                    'notify-batch-finished': {
                        table: 'sysevent_email_action'
                        id: 'cf76d9c9494949edadaddb7c08644f7c'
                    }
                    'notify-updates-ready': {
                        table: 'sysevent_email_action'
                        id: 'a2e518a20cdd451595302c3e1455f3ea'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '481ee7ec84664d79b71fa6a433b7acbd'
                    }
                    'prop-digest-frequency': {
                        table: 'sys_properties'
                        id: 'a9141640b0024902a289de2e4c6da799'
                    }
                    'prop-digest-min-level': {
                        table: 'sys_properties'
                        id: '9f571531581a41bc93993a0446a469ff'
                    }
                    'prop-digest-watermark': {
                        table: 'sys_properties'
                        id: 'ce860b221dfc45d28485ac1df399ab15'
                    }
                    'prop-hide-dependencies': {
                        table: 'sys_properties'
                        id: '63d2be9386ad4335903a2a31ebf52d8b'
                    }
                    'prop-notify-on-finish': {
                        table: 'sys_properties'
                        id: '829a264f7ab5466c92ebd064ed31ae98'
                    }
                    'prop-notify-users': {
                        table: 'sys_properties'
                        id: 'dc2087f92bd54616ad3ea424fd65a0b6'
                    }
                    'prop-notify-watermark': {
                        table: 'sys_properties'
                        id: 'd6eb00fc104b496285cbb2a2646da891'
                    }
                    'prop-poll-seconds': {
                        table: 'sys_properties'
                        id: '53a28a471ba9416484f63bf454e2b7fd'
                    }
                    src_server_notify_ts: {
                        table: 'sys_module'
                        id: '8b0478ccb56e45608582e7e7c4b5f981'
                    }
                    'store-update-menu': {
                        table: 'sys_app_application'
                        id: '82405415eed6476e9616a6a28b50f9bd'
                    }
                    'store-update-module-apps': {
                        table: 'sys_app_module'
                        id: 'd80ca5e7aa62467aa4e16a0e0c91c722'
                    }
                    'store-update-module-check-job': {
                        table: 'sys_app_module'
                        id: '2745a03af67e4a89b2dfcec0311ca6b3'
                    }
                    'store-update-module-diagnostics': {
                        table: 'sys_app_module'
                        id: '5191c98a2e7b415e8671c474caa8a1e7'
                    }
                    'store-update-module-faq': {
                        table: 'sys_app_module'
                        id: 'c3a803d3a4544c12ad5e77c8a462e663'
                    }
                    'store-update-module-history': {
                        table: 'sys_app_module'
                        id: 'ab21ae5b592a458094d009d4349e22ae'
                    }
                    'store-update-module-items': {
                        table: 'sys_app_module'
                        id: 'cdfd3b55bb3f4da58f8da7f2586d798b'
                    }
                    'store-update-module-properties': {
                        table: 'sys_app_module'
                        id: '8cb16482c44a4844b91972f692c65b67'
                    }
                    'store-update-module-schedules': {
                        table: 'sys_app_module'
                        id: '67d617c2093842ecaa377bc25871c95f'
                    }
                    'store-update-module-separator': {
                        table: 'sys_app_module'
                        id: '78ac7837c72047e2ba77eb0fcb28cd38'
                    }
                    'store-update-module-setup': {
                        table: 'sys_app_module'
                        id: 'cedd6353199c486d81ae7e8b90c1aee0'
                    }
                    'store-update-module-updates': {
                        table: 'sys_app_module'
                        id: 'c45e4f9420be4cfd8177d941782a388d'
                    }
                }
                composite: [
                    {
                        table: 'sn_glider_source_artifact'
                        id: '05399edae9e24e02ad2bcdbf9084ab0d'
                        key: {
                            name: 'x_301833_store_upd_store_updates.do - BYOUI Files'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '3807867a2251440faa6e314c3f1755bc'
                        key: {
                            application_file: 'd18b650c8b9f4798b88f49b6fce8cb26'
                            source_artifact: '05399edae9e24e02ad2bcdbf9084ab0d'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '867d70c35d064184ad6df920ea3858c4'
                        key: {
                            application_file: 'f85ed398c12447399e000775533d8702'
                            source_artifact: '05399edae9e24e02ad2bcdbf9084ab0d'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '87a9e764ffa04185a581bffaac8bd478'
                        key: {
                            application_file: 'e4fa1e740ad14a49b68ccd7070ac8e4b'
                            source_artifact: '05399edae9e24e02ad2bcdbf9084ab0d'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'd18b650c8b9f4798b88f49b6fce8cb26'
                        key: {
                            name: 'x_301833_store_upd/main.js.map'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: 'e4fa1e740ad14a49b68ccd7070ac8e4b'
                        key: {
                            name: 'x_301833_store_upd/main'
                        }
                    },
                    {
                        table: 'sys_ui_page'
                        id: 'f85ed398c12447399e000775533d8702'
                        key: {
                            endpoint: 'x_301833_store_upd_store_updates.do'
                        }
                    },
                ]
            }
        }
    }
}
