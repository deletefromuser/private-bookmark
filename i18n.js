(function () {
  const LANGUAGE_STORAGE_KEY = 'pb.uiLanguage';
  const SUPPORTED_LANGUAGES = ['en', 'ja', 'zh-CN'];

  const MESSAGES = {
    en: {
      'common.loading': 'Loading...',
      'common.ok': 'OK',
      'common.cancel': 'Cancel',
      'common.prev': 'Prev',
      'common.next': 'Next',
      'common.refresh': 'Refresh',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.removeAll': 'Remove All',
      'common.close': 'Close',
      'common.clear': 'Clear',
      'common.search': 'Search',
      'common.pageInfo': '{start}-{end} of {total}',
      'common.defaultFolder': 'Default',
      'common.importedFolder': 'Imported',

      'popup.title': 'Private Bookmark',
      'popup.heading': 'Private Bookmark',
      'popup.optionsHeading': 'Options',
      'popup.optionsDescription':
        'Manage password and other settings in the Options page.',
      'popup.openOptions': 'Open Options',
      'popup.addCurrent': 'Add Current Tab',
      'popup.monitorDomain': 'Monitor Current Domain',
      'popup.openView': 'Open View Page',
      'popup.openHistory': 'Open History Viewer',
      'popup.bookmarkAdded': 'Bookmark added',

      'add.title': 'Add Bookmark',
      'add.heading': 'Add Bookmark',
      'add.titlePlaceholder': 'Title',
      'add.urlPlaceholder': 'URL',
      'add.add': 'Add',
      'add.bookmarkAdded': 'Bookmark added',
      'add.urlRequired': 'URL required',
      'add.onlyHttp': 'Only http(s) URLs can be bookmarked',
      'add.addCurrentFolder': 'Folder:',
      'popup.urlRequired': 'URL required',
      'popup.onlyHttp': 'Only http(s) URLs can be bookmarked',
      'popup.noActiveTabUrl': 'No active tab URL',
      'popup.domainAlreadyMonitored': 'Domain is already monitored',
      'popup.domainAdded': 'Domain added to monitored list',

      'view.title': 'Private Bookmarks - View',
      'view.heading': 'Private Bookmarks',
      'view.authChecking': 'Checking...',
      'view.authNoPassword': 'No password set — click Unlock to view.',
      'view.passwordPlaceholder': 'Enter password',
      'view.unlock': 'Unlock',
      'view.bookmarksHeading': 'Bookmarks',
      'view.noBookmarksOnPage': 'No bookmarks on this page',
      'view.noBookmarks': 'No bookmarks',
      'view.confirmDeleteAll': 'Delete ALL bookmarks? This cannot be undone.',
      'view.deleteAllFailed': 'Failed to delete bookmarks',
      'view.confirmDelete': 'Delete bookmark?',
      'view.newTitlePrompt': 'New title',
      'view.newUrlPrompt': 'New URL (leave blank to keep)',

      'history.title': 'Private Visit History',
      'history.heading': 'Private Visit History',
      'history.instruction':
        'Click a title to open the corresponding page (opens in a new tab).',
      'history.passwordPlaceholder': 'Password',
      'history.searchTitleLabel': 'Title keywords',
      'history.searchTitlePlaceholder': 'Search by title keywords',
      'history.searchUrlLabel': 'URL keywords',
      'history.searchUrlPlaceholder': 'Search by URL or domain',
      'history.startDateLabel': 'Start date',
      'history.endDateLabel': 'End date',
      'history.noVisits': '(no visits recorded yet)',
      'history.confirmDeleteEntry': 'Delete this history entry? This cannot be undone.',

      'options.title': 'Private Bookmark - Options',
      'options.heading': 'Options',
      'options.passwordHeading': 'Password',
      'options.passwordDescription':
        'Set or clear the password used to unlock the View page.',
      'options.newPasswordPlaceholder': 'New password (leave blank to keep)',
      'options.setPassword': 'Set Password',
      'options.clearPassword': 'Clear Password',
      'options.confirmClearPassword':
        'Clear the password? This will allow anyone to open the View page without a password.',
      'options.enterPasswordToSet': 'Enter a password to set.',
      'options.currentPasswordChangePrompt': 'Enter current password to change it',
      'options.currentPasswordClearPrompt': 'Enter current password to clear it',
      'options.currentIncorrectChange': 'Current password incorrect. Change aborted.',
      'options.currentIncorrectClear': 'Current password incorrect. Clear aborted.',
      'options.passwordChanged': 'Password changed.',
      'options.passwordCleared': 'Password cleared.',
      'options.passwordIsSet': 'Password is set.',
      'options.noPasswordSet': 'No password set.',
      'options.foldersHeading': 'Folders',
      'options.newFolderPlaceholder': 'New folder name',
      'options.createFolder': 'Create Folder',
      'options.renameFolder': 'Rename',
      'options.deleteFolder': 'Delete',
      'options.folderNotFound': 'Folder not found',
      'options.folderNameRequired': 'Folder name required',
      'options.newFolderNamePrompt': 'New folder name',
      'options.deleteFolderPrompt':
        'Delete folder "{folder}" — what to do with its bookmarks?',
      'options.deleteBookmarksOption': 'Delete bookmarks',
      'options.moveBookmarksOption': 'Move bookmarks to:',
      'options.noOtherFolder': '(no other folder)',
      'options.confirm': 'Confirm',
      'options.noTargetFolder': 'No target folder selected',
      'options.importExportHeading': 'Import / Export',
      'options.importDescription':
        'Select a Chrome bookmark folder to import into a new private folder:',
      'options.importChromeButton': 'Import Selected Chrome Folder',
      'options.exportDescription': 'Export private bookmarks to HTML:',
      'options.exportHtmlButton': 'Export as HTML',
      'options.backupHeading': 'Backup / Restore',
      'options.backupDescription':
        'Export the entire SQLite database to a JSON file, or restore from a previously exported file.',
      'options.exportDbButton': 'Export Database (JSON)',
      'options.restoreDbButton': 'Restore Database',
      'options.openSqlConsole': 'Open SQL Console',
      'options.historyMonitoringHeading': 'History Monitoring',
      'options.historyMonitoringDescription':
        "Monitored domains: visits to these domains will be recorded to the extension's private history and removed from the browser's native history.",
      'options.domainPlaceholder': 'example.com',
      'options.addDomainButton': 'Add Domain',
      'options.clearDomainsButton': 'Clear All Monitored Domains',
      'options.addDomainPatternPrompt': 'Add monitored domain with URL pattern',
      'options.editDomainPatternPrompt': 'Edit URL pattern for domain "{domain}"',
      'options.domainLabel': 'Domain',
      'options.patternLabel': 'URL Pattern',
      'popup.addDomainWithPattern': 'Add monitored domain with URL pattern',
      'popup.domainLabel': 'Domain',
      'popup.domainAddedWithPattern': 'Added monitored domain "{domain}" with pattern "{pattern}"',
      'options.privateHistoryHeading': 'Private Visit History',
      'options.privateHistoryDescription':
        'Visits recorded for monitored domains (native history is removed).',
      'options.exportHistoryButton': 'Export Visit History (JSON)',
      'options.clearHistoryButton': 'Clear Visit History',
      'options.migrationHeading': 'Storage Migration',
      'options.migrationDescription':
        'Upgrade extension storage to the new SQLite-backed database. This runs a one-time migration from the existing extension storage into the embedded SQLite DB used by the extension.',
      'options.migrateButton': 'Migrate to SQLite',
      'options.languageHeading': 'Language',
      'options.languageDescription': 'Choose the language used by the extension pages.',
      'options.languageSystem': 'System default',
      'options.languageEnglish': 'English',
      'options.languageJapanese': '日本語',
      'options.languageChinese': '简体中文',
      'options.removeDomainConfirm': 'Remove monitored domain "{domain}"?',
      'options.clearDomainsConfirm':
        'Clear all monitored domains? This cannot be undone.',
      'options.exportPreparing': 'Preparing export...',
      'options.exported': 'Database exported',
      'options.exportFailed': 'Export failed: {error}',
      'options.selectJsonFirst': 'Select a JSON file first',
      'options.invalidJson': 'Invalid JSON file',
      'options.missingTables': 'JSON missing required tables',
      'options.invalidRows': 'JSON contains invalid rows',
      'options.restoreConfirm':
        'Restore this backup? All current bookmarks, history, and settings will be replaced.',
      'options.restoring': 'Restoring database...',
      'options.restored': 'Database restored (refreshing UI)...',
      'options.restoreFailed': 'Restore failed: {error}',
      'options.clearHistoryConfirm':
        'Clear private visit history? This cannot be undone.',
      'options.importSelectFolder': 'Select a Chrome folder to import',
      'options.importing': 'Importing...',
      'options.noNodes': 'No nodes found',
      'options.noBookmarksToImport': 'No bookmarks to import in selected folder.',
      'options.importedCount': 'Imported {count} bookmarks into folder "{folder}"',
      'options.importedFolderName': 'Imported',
      'options.migrationStarting': 'Starting migration...',
      'options.migrationCompleted': 'Migration completed successfully.',
      'options.migrationFailed': 'Migration failed: {error}',
      'options.migrationError': 'Migration error: {error}',
      'options.unknownError': 'unknown',
      'options.addBookmarkHeading': 'Add Bookmark',
      'options.addBookmarkDescription':
        'Open the Add Bookmark page in a new tab.',
      'options.openAddPage': 'Add Bookmark',

      'sql.title': 'SQL Console',
      'sql.heading': 'SQL Console',
      'sql.description':
        'Run read-only queries or export results. Destructive statements (DELETE/UPDATE/INSERT) require confirmation.',
      'sql.inputPlaceholder': 'Enter SQL here...',
      'sql.run': 'Run',
      'sql.exportResults': 'Export Last Results (JSON)',
      'sql.enterSql': 'Enter SQL to run',
      'sql.destructiveConfirm':
        'This SQL contains write or schema-changing statements. Continue?',
      'sql.cancelled': 'Cancelled',
      'sql.running': 'Running...',
      'sql.returnedRows': 'Returned {count} rows',
      'sql.noRows': '(no rows)',
      'sql.noResultsToExport': 'No results to export',
      'sql.errorPrefix': 'Error: {error}',

      'auth.passwordRequired': 'Password required',
      'auth.wrongPassword': 'Wrong password',
      'auth.noPasswordSet': 'No password set — set one in Options',
      'auth.enterPassword': 'Enter password to view.',

      'db.noResponse': 'No response from background',
      'db.queryFailed': 'Query failed',
    },

    ja: {
      'common.loading': '読み込み中...',
      'common.ok': 'OK',
      'common.cancel': 'キャンセル',
      'common.prev': '前へ',
      'common.next': '次へ',
      'common.refresh': '更新',
      'common.delete': '削除',
      'common.edit': '編集',
      'common.removeAll': 'すべて削除',
      'common.close': '閉じる',
      'common.clear': 'クリア',
      'common.search': '検索',
      'common.pageInfo': '{total} 件中 {start}-{end} 件',
      'common.defaultFolder': 'デフォルト',
      'common.importedFolder': 'インポート済み',

      'popup.title': 'プライベートブックマーク',
      'popup.heading': 'プライベートブックマーク',
      'popup.optionsHeading': 'オプション',
      'popup.optionsDescription':
        'パスワードやその他の設定はオプションページで管理できます。',
      'popup.openOptions': 'オプションを開く',
      'popup.addCurrent': '現在のタブを追加',
      'popup.monitorDomain': '現在のドメインを監視',
      'popup.openView': 'ビューアを開く',
      'popup.openHistory': '履歴ビューアを開く',
      'popup.bookmarkAdded': 'ブックマークを追加しました',
      'popup.addDomainWithPattern': '監視ドメインとURLパターンを追加',
      'popup.domainLabel': 'ドメイン',
      'popup.domainAddedWithPattern': '監視ドメイン "{domain}" をパターン "{pattern}" で追加しました',

      'options.historyMonitoringHeading': '履歴の監視',
      'options.historyMonitoringDescription':
        '監視ドメイン: これらのドメインへの訪問は拡張機能のプライベート履歴に記録され、ブラウザのネイティブ履歴から削除されます。',
      'options.domainPlaceholder': 'example.com',
      'options.addDomainButton': 'ドメインを追加',
      'options.clearDomainsButton': '監視ドメインをすべて解除',
      'options.addDomainPatternPrompt': '監視ドメインとURLパターンを追加',
      'options.editDomainPatternPrompt': 'ドメイン "{domain}" のURLパターンを編集',
      'options.domainLabel': 'ドメイン',
      'options.patternLabel': 'URLパターン',

      'add.title': 'ブックマークを追加',
      'add.heading': 'ブックマークを追加',
      'add.titlePlaceholder': 'タイトル',
      'add.urlPlaceholder': 'URL',
      'add.add': '追加',
      'add.bookmarkAdded': 'ブックマークを追加しました',
      'add.urlRequired': 'URL が必要です',
      'add.onlyHttp': 'http(s) の URL のみブックマークできます',
      'add.addCurrentFolder': 'フォルダ:',
      'popup.urlRequired': 'URL が必要です',
      'popup.onlyHttp': 'http(s) の URL のみブックマークできます',
      'popup.noActiveTabUrl': 'アクティブなタブの URL がありません',
      'popup.domainAlreadyMonitored': 'このドメインはすでに監視されています',
      'popup.domainAdded': '監視ドメインに追加しました',

      'view.title': 'プライベートブックマーク - ビュー',
      'view.heading': 'プライベートブックマーク',
      'view.authChecking': '確認中...',
      'view.authNoPassword':
        'パスワードが設定されていません — ロック解除をクリックして表示してください。',
      'view.passwordPlaceholder': 'パスワードを入力',
      'view.unlock': 'ロック解除',
      'view.bookmarksHeading': 'ブックマーク',
      'view.noBookmarksOnPage': 'このページにブックマークはありません',
      'view.noBookmarks': 'ブックマークはありません',
      'view.confirmDeleteAll':
        'すべてのブックマークを削除しますか？この操作は元に戻せません。',
      'view.deleteAllFailed': 'ブックマークの削除に失敗しました',
      'view.confirmDelete': 'ブックマークを削除しますか？',
      'view.newTitlePrompt': '新しいタイトル',
      'view.newUrlPrompt': '新しい URL（空欄の場合は変更しません）',

      'history.title': 'プライベート閲覧履歴',
      'history.heading': 'プライベート閲覧履歴',
      'history.instruction': 'タイトルをクリックすると該当ページが新しいタブで開きます。',
      'history.passwordPlaceholder': 'パスワード',
      'history.searchTitleLabel': 'タイトルのキーワード',
      'history.searchTitlePlaceholder': 'タイトルのキーワードで検索',
      'history.searchUrlLabel': 'URL のキーワード',
      'history.searchUrlPlaceholder': 'URL またはドメインで検索',
      'history.startDateLabel': '開始日',
      'history.endDateLabel': '終了日',
      'history.noVisits': '（まだ訪問履歴がありません）',
      'history.confirmDeleteEntry': 'この履歴を削除しますか？この操作は元に戻せません。',

      'options.title': 'プライベートブックマーク - オプション',
      'options.heading': 'オプション',
      'options.passwordHeading': 'パスワード',
      'options.passwordDescription':
        'ビューアページのロックを解除するパスワードを設定または解除します。',
      'options.newPasswordPlaceholder': '新しいパスワード（空欄の場合は変更しません）',
      'options.setPassword': 'パスワードを設定',
      'options.clearPassword': 'パスワードを解除',
      'options.confirmClearPassword':
        'パスワードを解除しますか？解除すると、誰でもパスワードなしでビューアページを開けるようになります。',
      'options.enterPasswordToSet': '設定するパスワードを入力してください。',
      'options.currentPasswordChangePrompt':
        '変更するには現在のパスワードを入力してください',
      'options.currentPasswordClearPrompt':
        '解除するには現在のパスワードを入力してください',
      'options.currentIncorrectChange':
        '現在のパスワードが正しくありません。変更を中止しました。',
      'options.currentIncorrectClear':
        '現在のパスワードが正しくありません。解除を中止しました。',
      'options.passwordChanged': 'パスワードを変更しました。',
      'options.passwordCleared': 'パスワードを解除しました。',
      'options.passwordIsSet': 'パスワードが設定されています。',
      'options.noPasswordSet': 'パスワードが設定されていません。',
      'options.foldersHeading': 'フォルダ',
      'options.newFolderPlaceholder': '新しいフォルダ名',
      'options.createFolder': 'フォルダを作成',
      'options.renameFolder': '名前を変更',
      'options.deleteFolder': '削除',
      'options.folderNotFound': 'フォルダが見つかりません',
      'options.folderNameRequired': 'フォルダ名が必要です',
      'options.newFolderNamePrompt': '新しいフォルダ名',
      'options.deleteFolderPrompt':
        'フォルダ「{folder}」を削除します。ブックマークをどうしますか？',
      'options.deleteBookmarksOption': 'ブックマークを削除',
      'options.moveBookmarksOption': 'ブックマークの移動先:',
      'options.noOtherFolder': '（他のフォルダはありません）',
      'options.confirm': '確定',
      'options.noTargetFolder': '移動先フォルダが選択されていません',
      'options.importExportHeading': 'インポート / エクスポート',
      'options.importDescription':
        '新しいプライベートフォルダにインポートする Chrome ブックマークフォルダを選択:',
      'options.importChromeButton': '選択した Chrome フォルダをインポート',
      'options.exportDescription': 'プライベートブックマークを HTML にエクスポート:',
      'options.exportHtmlButton': 'HTML としてエクスポート',
      'options.backupHeading': 'バックアップ / 復元',
      'options.backupDescription':
        'SQLite データベース全体を JSON ファイルにエクスポートするか、以前にエクスポートしたファイルから復元します。',
      'options.exportDbButton': 'データベースをエクスポート (JSON)',
      'options.restoreDbButton': 'データベースを復元',
      'options.openSqlConsole': 'SQL コンソールを開く',
      'options.historyMonitoringHeading': '履歴の監視',
      'options.historyMonitoringDescription':
        '監視ドメイン: これらのドメインへの訪問は拡張機能のプライベート履歴に記録され、ブラウザのネイティブ履歴から削除されます。',
      'options.domainPlaceholder': 'example.com',
      'options.addDomainButton': 'ドメインを追加',
      'options.clearDomainsButton': '監視ドメインをすべて解除',
      'options.privateHistoryHeading': 'プライベート閲覧履歴',
      'options.privateHistoryDescription':
        '監視ドメインで記録された訪問です（ネイティブ履歴は削除されます）。',
      'options.exportHistoryButton': '閲覧履歴をエクスポート (JSON)',
      'options.clearHistoryButton': '閲覧履歴を削除',
      'options.migrationHeading': 'ストレージの移行',
      'options.migrationDescription':
        '拡張機能のストレージを新しい SQLite データベースに移行します。既存の拡張機能ストレージから、拡張機能が使用する組み込み SQLite DB へ一度だけ移行します。',
      'options.migrateButton': 'SQLite に移行',
      'options.languageHeading': '言語',
      'options.languageDescription': '拡張機能ページで使用する言語を選択します。',
      'options.languageSystem': 'システム設定に合わせる',
      'options.languageEnglish': 'English',
      'options.languageJapanese': '日本語',
      'options.languageChinese': '简体中文',
      'options.removeDomainConfirm': '監視ドメイン「{domain}」を削除しますか？',
      'options.clearDomainsConfirm':
        '監視ドメインをすべて解除しますか？この操作は元に戻せません。',
      'options.exportPreparing': 'エクスポートを準備中...',
      'options.exported': 'データベースをエクスポートしました',
      'options.exportFailed': 'エクスポートに失敗しました: {error}',
      'options.selectJsonFirst': '先に JSON ファイルを選択してください',
      'options.invalidJson': '無効な JSON ファイルです',
      'options.missingTables': 'JSON に必要なテーブルがありません',
      'options.invalidRows': 'JSON に無効な行が含まれています',
      'options.restoreConfirm':
        'このバックアップを復元しますか？現在のブックマーク、履歴、設定はすべて置き換えられます。',
      'options.restoring': 'データベースを復元中...',
      'options.restored': 'データベースを復元しました（UI を更新しています）...',
      'options.restoreFailed': '復元に失敗しました: {error}',
      'options.clearHistoryConfirm':
        'プライベート閲覧履歴を削除しますか？この操作は元に戻せません。',
      'options.importSelectFolder': 'インポートする Chrome フォルダを選択してください',
      'options.importing': 'インポート中...',
      'options.noNodes': 'ノードが見つかりません',
      'options.noBookmarksToImport':
        '選択したフォルダにインポートするブックマークがありません。',
      'options.importedCount':
        '{count} 件のブックマークをフォルダ「{folder}」にインポートしました',
      'options.importedFolderName': 'インポート済み',
      'options.migrationStarting': '移行を開始しています...',
      'options.migrationCompleted': '移行が正常に完了しました。',
      'options.migrationFailed': '移行に失敗しました: {error}',
      'options.migrationError': '移行エラー: {error}',
      'options.unknownError': '不明',
      'options.addBookmarkHeading': 'ブックマークを追加',
      'options.addBookmarkDescription':
        'ブックマーク追加ページを新しいタブで開きます。',
      'options.openAddPage': 'ブックマークを追加',

      'sql.title': 'SQL コンソール',
      'sql.heading': 'SQL コンソール',
      'sql.description':
        '読み取り専用クエリの実行や結果のエクスポートができます。破壊的なステートメント（DELETE/UPDATE/INSERT）には確認が必要です。',
      'sql.inputPlaceholder': 'ここに SQL を入力...',
      'sql.run': '実行',
      'sql.exportResults': '最後の結果をエクスポート (JSON)',
      'sql.enterSql': '実行する SQL を入力してください',
      'sql.destructiveConfirm':
        'この SQL には書き込みまたはスキーマ変更のステートメントが含まれています。続行しますか？',
      'sql.cancelled': 'キャンセルしました',
      'sql.running': '実行中...',
      'sql.returnedRows': '{count} 行を返しました',
      'sql.noRows': '（行がありません）',
      'sql.noResultsToExport': 'エクスポートする結果がありません',
      'sql.errorPrefix': 'エラー: {error}',

      'auth.passwordRequired': 'パスワードが必要です',
      'auth.wrongPassword': 'パスワードが正しくありません',
      'auth.noPasswordSet':
        'パスワードが設定されていません — オプションで設定してください',
      'auth.enterPassword': '表示するにはパスワードを入力してください。',

      'db.noResponse': 'バックグラウンドから応答がありません',
      'db.queryFailed': 'クエリに失敗しました',
    },

    'zh-CN': {
      'common.loading': '加载中...',
      'common.ok': '确定',
      'common.cancel': '取消',
      'common.prev': '上一页',
      'common.next': '下一页',
      'common.refresh': '刷新',
      'common.delete': '删除',
      'common.edit': '编辑',
      'common.removeAll': '全部移除',
      'common.close': '关闭',
      'common.clear': '清除',
      'common.search': '搜索',
      'common.pageInfo': '第 {start}-{end} 条，共 {total} 条',
      'common.defaultFolder': '默认',
      'common.importedFolder': '已导入',

      'popup.title': '私密书签',
      'popup.heading': '私密书签',
      'popup.optionsHeading': '选项',
      'popup.optionsDescription': '在选项页面管理密码和其他设置。',
      'popup.openOptions': '打开选项',
      'popup.addCurrent': '添加当前标签页',
      'popup.monitorDomain': '监控当前域名',
      'popup.openView': '打开查看页面',
      'popup.openHistory': '打开历史查看器',
      'popup.bookmarkAdded': '已添加书签',

      'add.title': '添加书签',
      'add.heading': '添加书签',
      'add.titlePlaceholder': '标题',
      'add.urlPlaceholder': 'URL',
      'add.add': '添加',
      'add.bookmarkAdded': '已添加书签',
      'add.urlRequired': '需要 URL',
      'add.onlyHttp': '只能收藏 http(s) URL',
      'add.addCurrentFolder': '文件夹:',
      'popup.urlRequired': '需要 URL',
      'popup.onlyHttp': '只能收藏 http(s) URL',
      'popup.noActiveTabUrl': '当前标签页没有 URL',
      'popup.domainAlreadyMonitored': '该域名已在监控列表中',
      'popup.domainAdded': '已添加到监控域名',
      'popup.addDomainWithPattern': '添加监控域名和URL模式',
      'popup.domainLabel': '域名',
      'popup.domainAddedWithPattern': '已添加监控域名 "{domain}", 模式 "{pattern}"',

      'view.title': '私密书签 - 查看',
      'view.heading': '私密书签',
      'view.authChecking': '正在检查...',
      'view.authNoPassword': '未设置密码 — 点击解锁即可查看。',
      'view.passwordPlaceholder': '输入密码',
      'view.unlock': '解锁',
      'view.bookmarksHeading': '书签',
      'view.noBookmarksOnPage': '此页没有书签',
      'view.noBookmarks': '没有书签',
      'view.confirmDeleteAll': '删除所有书签？此操作无法撤销。',
      'view.deleteAllFailed': '删除书签失败',
      'view.confirmDelete': '删除此书签？',
      'view.newTitlePrompt': '新标题',
      'view.newUrlPrompt': '新 URL（留空则保持不变）',

      'history.title': '私密访问历史',
      'history.heading': '私密访问历史',
      'history.instruction': '点击标题可在新标签页中打开对应页面。',
      'history.passwordPlaceholder': '密码',
      'history.searchTitleLabel': '标题关键词',
      'history.searchTitlePlaceholder': '按标题关键词搜索',
      'history.searchUrlLabel': 'URL 关键词',
      'history.searchUrlPlaceholder': '按 URL 或域名搜索',
      'history.startDateLabel': '开始日期',
      'history.endDateLabel': '结束日期',
      'history.noVisits': '（尚未记录访问）',
      'history.confirmDeleteEntry': '删除此历史记录？此操作无法撤销。',

      'options.title': '私密书签 - 选项',
      'options.heading': '选项',
      'options.passwordHeading': '密码',
      'options.passwordDescription': '设置或清除用于解锁查看页面的密码。',
      'options.newPasswordPlaceholder': '新密码（留空则保持不变）',
      'options.setPassword': '设置密码',
      'options.clearPassword': '清除密码',
      'options.historyMonitoringHeading': '历史监控',
      'options.historyMonitoringDescription':
        '监控域名: 这些域名内的访问将被记录到扩展程序的私人历史中，并从浏览器的原生历史中删除。',
      'options.domainPlaceholder': 'example.com',
      'options.addDomainButton': '添加域名',
      'options.clearDomainsButton': '清除所有监控域名',
      'options.addDomainPatternPrompt': '添加监控域名和URL模式',
      'options.editDomainPatternPrompt': '编辑域名 "{domain}" 的URL模式',
      'options.domainLabel': '域名',
      'options.patternLabel': 'URL模式',
      'options.confirmClearPassword':
        '清除密码？这将允许任何人无需密码即可打开查看页面。',
      'options.enterPasswordToSet': '请输入要设置的密码。',
      'options.currentPasswordChangePrompt': '输入当前密码以进行更改',
      'options.currentPasswordClearPrompt': '输入当前密码以清除',
      'options.currentIncorrectChange': '当前密码不正确。已中止更改。',
      'options.currentIncorrectClear': '当前密码不正确。已中止清除。',
      'options.passwordChanged': '密码已更改。',
      'options.passwordCleared': '密码已清除。',
      'options.passwordIsSet': '已设置密码。',
      'options.noPasswordSet': '未设置密码。',
      'options.foldersHeading': '文件夹',
      'options.newFolderPlaceholder': '新文件夹名称',
      'options.createFolder': '创建文件夹',
      'options.renameFolder': '重命名',
      'options.deleteFolder': '删除',
      'options.folderNotFound': '找不到文件夹',
      'options.folderNameRequired': '需要文件夹名称',
      'options.newFolderNamePrompt': '新文件夹名称',
      'options.deleteFolderPrompt': '删除文件夹“{folder}” — 其中的书签如何处理？',
      'options.deleteBookmarksOption': '删除书签',
      'options.moveBookmarksOption': '将书签移动到：',
      'options.noOtherFolder': '（没有其他文件夹）',
      'options.confirm': '确认',
      'options.noTargetFolder': '未选择目标文件夹',
      'options.importExportHeading': '导入 / 导出',
      'options.importDescription': '选择要导入到新私密文件夹的 Chrome 书签文件夹：',
      'options.importChromeButton': '导入所选的 Chrome 文件夹',
      'options.exportDescription': '将私密书签导出为 HTML：',
      'options.exportHtmlButton': '导出为 HTML',
      'options.backupHeading': '备份 / 恢复',
      'options.backupDescription':
        '将整个 SQLite 数据库导出为 JSON 文件，或从之前导出的文件恢复。',
      'options.exportDbButton': '导出数据库 (JSON)',
      'options.restoreDbButton': '恢复数据库',
      'options.openSqlConsole': '打开 SQL 控制台',
      'options.historyMonitoringHeading': '历史记录监控',
      'options.historyMonitoringDescription':
        '监控域名：访问这些域名时，记录会保存到扩展的私密历史中，并从浏览器的原生历史记录中删除。',
      'options.domainPlaceholder': 'example.com',
      'options.addDomainButton': '添加域名',
      'options.clearDomainsButton': '清除所有监控域名',
      'options.privateHistoryHeading': '私密访问历史',
      'options.privateHistoryDescription':
        '为监控域名记录的访问（原生历史记录已被删除）。',
      'options.exportHistoryButton': '导出访问历史 (JSON)',
      'options.clearHistoryButton': '清除访问历史',
      'options.migrationHeading': '存储迁移',
      'options.migrationDescription':
        '将扩展存储升级到新的 SQLite 数据库。这会将现有扩展存储一次性迁移到扩展使用的内置 SQLite 数据库。',
      'options.migrateButton': '迁移到 SQLite',
      'options.languageHeading': '语言',
      'options.languageDescription': '选择扩展页面使用的语言。',
      'options.languageSystem': '跟随系统',
      'options.languageEnglish': 'English',
      'options.languageJapanese': '日本語',
      'options.languageChinese': '简体中文',
      'options.removeDomainConfirm': '移除监控域名“{domain}”？',
      'options.clearDomainsConfirm': '清除所有监控域名？此操作无法撤销。',
      'options.exportPreparing': '正在准备导出...',
      'options.exported': '数据库已导出',
      'options.exportFailed': '导出失败：{error}',
      'options.selectJsonFirst': '请先选择 JSON 文件',
      'options.invalidJson': 'JSON 文件无效',
      'options.missingTables': 'JSON 缺少必需的表格',
      'options.invalidRows': 'JSON 包含无效行',
      'options.restoreConfirm': '恢复此备份？当前所有书签、历史记录和设置都将被替换。',
      'options.restoring': '正在恢复数据库...',
      'options.restored': '数据库已恢复（正在刷新界面）...',
      'options.restoreFailed': '恢复失败：{error}',
      'options.clearHistoryConfirm': '清除私密访问历史？此操作无法撤销。',
      'options.importSelectFolder': '请选择要导入的 Chrome 文件夹',
      'options.importing': '正在导入...',
      'options.noNodes': '找不到节点',
      'options.noBookmarksToImport': '所选文件夹中没有可导入的书签。',
      'options.importedCount': '已将 {count} 个书签导入文件夹“{folder}”',
      'options.importedFolderName': '已导入',
      'options.migrationStarting': '正在开始迁移...',
      'options.migrationCompleted': '迁移成功完成。',
      'options.migrationFailed': '迁移失败：{error}',
      'options.migrationError': '迁移错误：{error}',
      'options.unknownError': '未知',
      'options.addBookmarkHeading': '添加书签',
      'options.addBookmarkDescription':
        '在新标签页中打开添加书签页面。',
      'options.openAddPage': '添加书签',

      'sql.title': 'SQL 控制台',
      'sql.heading': 'SQL 控制台',
      'sql.description':
        '运行只读查询或导出结果。破坏性语句（DELETE/UPDATE/INSERT）需要确认。',
      'sql.inputPlaceholder': '在此输入 SQL...',
      'sql.run': '运行',
      'sql.exportResults': '导出上次结果 (JSON)',
      'sql.enterSql': '请输入要运行的 SQL',
      'sql.destructiveConfirm': '此 SQL 包含写入或更改结构的语句。是否继续？',
      'sql.cancelled': '已取消',
      'sql.running': '正在运行...',
      'sql.returnedRows': '返回了 {count} 行',
      'sql.noRows': '（没有行）',
      'sql.noResultsToExport': '没有可导出的结果',
      'sql.errorPrefix': '错误：{error}',

      'auth.passwordRequired': '需要密码',
      'auth.wrongPassword': '密码错误',
      'auth.noPasswordSet': '未设置密码 — 请在选项中设置',
      'auth.enterPassword': '输入密码以查看。',

      'db.noResponse': '后台没有响应',
      'db.queryFailed': '查询失败',
    },
  };

  function getDocument() {
    return typeof document === 'undefined' ? null : document;
  }

  function normalizeLanguage(value) {
    const raw = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-');
    if (!raw) return null;
    if (raw.startsWith('ja')) return 'ja';
    if (raw.startsWith('zh')) return 'zh-CN';
    if (raw.startsWith('en')) return 'en';
    return null;
  }

  function detectLanguage() {
    try {
      const detected = normalizeLanguage(globalThis.chrome?.i18n?.getUILanguage?.());
      if (detected) return detected;
    } catch (e) {
      // Fall through to navigator.
    }
    const navigatorLanguage = globalThis.navigator?.language;
    return normalizeLanguage(navigatorLanguage) || 'en';
  }

  function readStoredLanguage() {
    try {
      return normalizeLanguage(globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function getPreference() {
    return readStoredLanguage() || 'auto';
  }

  function translate(language, key, vars) {
    const normalized = normalizeLanguage(language) || 'en';
    const catalog = MESSAGES[normalized] || MESSAGES.en;
    const template = catalog[key] ?? MESSAGES.en[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (match, name) => {
      if (!vars || !Object.prototype.hasOwnProperty.call(vars, name)) return match;
      return String(vars[name]);
    });
  }

  let currentLanguage = 'en';

  function t(key, vars) {
    return translate(currentLanguage, key, vars);
  }

  function applyTranslations(root) {
    const doc = getDocument();
    const scope = root || doc;
    if (!scope || typeof scope.querySelectorAll !== 'function') return;

    if (doc && scope === doc) {
      doc.documentElement.lang = currentLanguage;
    }

    scope.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.setAttribute(
        'placeholder',
        t(element.getAttribute('data-i18n-placeholder'))
      );
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.setAttribute('title', t(element.getAttribute('data-i18n-title')));
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute('aria-label', t(element.getAttribute('data-i18n-aria-label')));
    });
  }

  function setLanguage(language) {
    if (String(language) === 'auto') {
      try {
        globalThis.localStorage?.removeItem(LANGUAGE_STORAGE_KEY);
      } catch (e) {
        // Preference remains in memory only.
      }
      currentLanguage = detectLanguage();
    } else {
      const normalized = normalizeLanguage(language) || 'en';
      try {
        globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, normalized);
      } catch (e) {
        // Preference remains in memory only.
      }
      currentLanguage = normalized;
    }
    applyTranslations();
    return currentLanguage;
  }

  function getLanguage() {
    return currentLanguage;
  }

  function init() {
    currentLanguage = readStoredLanguage() || detectLanguage();
    const doc = getDocument();
    if (!doc) return;
    const apply = () => applyTranslations(doc);
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
      apply();
    }
  }

  init();

  globalThis.I18n = {
    t,
    translate,
    normalizeLanguage,
    detectLanguage,
    setLanguage,
    getLanguage,
    getPreference,
    applyTranslations,
    messages: MESSAGES,
    languages: SUPPORTED_LANGUAGES.slice(),
  };
})();
