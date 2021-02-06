# starlive2d

Live2D モデルを読み込むためのフレームワークです。

WebGL 版と Pixi 版を用意しています。

これを利用したサンプル実装は [こちら](https://github.com/ExceptionError/starlive2d-demo)

## セットアップ

1. [Live2D 公式の SDK](https://www.live2d.com/download/cubism-sdk/download-web/) をダウンロードする
2. [Live2D/CubismWebFramework](https://github.com/Live2D/CubismWebFramework) を clone する
3. 以下のようなディレクトリ構造になるように配置する

```
- Core: [1]でダウンロードしたSDKのCoreディレクトリだけあればよい
- cubism: [2]でcloneしたフレームワーク
- starlive2d: これ
```

4. `yarn install`
5. `yarn build`

## 補足

ディレクトリ構成は [tsconfig.json](./tsconfig.json) の `paths` と `include` を変更すれば好きな構成にできます。

[Live2D 公式の SDK](https://www.live2d.com/download/cubism-sdk/download-web/) にもフレームワークは含まれていますが名前空間の関係で使い勝手が悪いです。

[Live2D/CubismWebFramework](https://github.com/Live2D/CubismWebFramework) はそれが改善されているのでこちらを追加で用意する必要があります。

## TODO/issue

- PixiModel にて filter を指定するとモデルが描画されなくなる

## 参考

[guansss/pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) を参考にしています。

こちらは Live2D 公式のフレームワークをフォークして改造したものを利用しています。

そのためか一部のモデルで表情がおかしくなるなどの問題が確認できたので、starlive2d を作りました。
