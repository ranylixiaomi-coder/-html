# 先发材料，再选范围和功能

第一次对话先给一条材料提示：试卷、参考答案；要讲听力，再附原始录音。已有解析或听力原文也可以一起发。已有材料不重复索要。先盘点这张卷有哪些题型、答案是否含听力原文，再按实际材料逐步问以下两项。只补问所选范围缺的材料。老师已说清范围和功能时，简短复述后直接执行。

第一问：这次做 **A 只做听力 / B 整张试卷 / C 只做指定板块**？在 WorkBuddy 直接发聊天选项，结束本轮并等下一条明确的用户回复。没有回复就保持待确认。老师只回复 C 时，列出本卷确实有的板块和题号供多选，例如“阅读理解（21–35题）、七选五（36–40题）”。已经说“只做阅读和完形”就跳过这一步。卷子没有听力时，菜单省略 A，保留其他字母的含义。已选听力但缺录音时才请老师补发。

第二问等范围确定再问。可多选批注、查词、速对答案、课堂工具、篇章精读（含思维导图）、写作迁移和文化背景。允许说“基础讲评就好”“全部”“沿用上次”。用老师一看就懂的描述，如“5 篇章精读（看思维导图）、7 文化背景（补充读懂文章需要的背景）”。只讲听力时，可以说明思维导图适用于阅读语篇，无需为本次勾选。原文、题目、答案与解析、定位、必要译文、音频/倍速/精听挖空、备课修订和记录导出属于所选范围的基础功能。

将老师的两项回答记录成 generation-plan.json，并用 `build.py ... --plan generation-plan.json --review teaching-review.json` 构建：

```json
{"confirmed":true,"sections":"listening","mode":"intensive","profile":"full","features":{"annotations":false,"dictionary":false,"classroom_tools":false,"quick_answers":true,"writing_transfer":false,"deep_reading":false,"culture_background":false}}
```

`sections` 接受 `all`、题型或实际章节 ID 逗号组合，`mode` 为 lesson/intensive，`profile` 为 full/quick，七个功能值必须全部记录。confirmed 只有收到范围和功能回答后才能置 true。迁移旧 exam.json 未带 features 时保留旧功能；新任务必须传计划，不能为了绕过未回答把 confirmed 直接填真。

`profile` 以老师本次确认的计划为准。新建计划还必须使用 `--response` 与 `--material` 登记实际回答和原件，详见 [新建与复核](reliable-generation.md)。命令行不能覆盖计划的范围、模式或档位；要改选项先更新计划。

## 文化背景

选中才编写，每篇精选理解原文确实需要的背景。字段 `culture_background` 为数组，每项含 `title`、`paragraph_id`、逐字 `quote`、`explanation`（背景事实）、`reading_connection`（这段背景怎样解释本篇，不能与 explanation 重复）、`teaching_note`（课堂怎么用）、`sources`（每项要有 `title`、http(s) 的 `url` 与 `supports`——这条来源支撑哪一句背景）。少任何一栏构建都会拦下并说明缺哪一栏。外部事实查可靠来源，区分原文信息与背景补充，避免民族性格概括及把背景当答案证据。不为凑数量硬写；本篇没有必要或资料无法确认时用 culture_note 说明。本篇顶部“文化背景”可直接打开；原文之后也保留折叠卡，保持逐段译文与原文位置。

## 备课编辑

顶栏“备课编辑”后，展开解析，点击虚线框内的题型、步骤、答案依据或方法迁移即可直接输入，失去焦点保存，Esc取消。答案、定位依据和其他复杂字段仍用题旁“修改讲解”，可改本班答案、题型、答案依据、解题步骤、选项辨析、方法迁移和易错提醒。选择题答案必须是现有选项；填空可逐行填写可接受答案；解法步骤按教师实际需要，允许少于三步。定位引句仍须来自真实原文。

原参考答案与解析保留，可恢复。修订答案标为“教师修订”，与速对答案同步；不修改来源台账或伪装官方答案。修订存在当前浏览器课堂记录中，换电脑或升级前导出记录，另一台导入恢复。并不自动改写硬盘原 HTML；不要宣称只发送 HTML 就携带浏览器里刚做的修改。

examples/teaching-plan.json 是合成界面测试示例，不是老师的已确认选择；新任务必须从实际回答建立自己的计划。

## 多选交互必须落实

范围为单选（指定板块时再多选）；功能用宿主真正支持的多选控件展示上述七项，只有明确确认的勾选项启用，不预选全部。宿主仅支持单选时不能伪装多选，改为编号清单，让老师一次回复多个编号（例如“1、2、5”），也支持全部、都不要、沿用上次。不逐项问七轮。没有明确确认、跳过或超时时保持待确认，在聊天里补问一次，不开始重处理。annotations 控制画笔和文字批注；dictionary 控制输入查词、点击查词及划选查词；词句教学内容与查词工具区分。原件、答案溯源、基本讲解、播放、备课编辑及记录导出不因关闭扩展而消失。

**编号清单与计划直接交给脚本，不要手写。** 无多选控件时先打印菜单：

```bash
python3 scripts/plan.py menu --stage scope
python3 scripts/plan.py menu --stage features
```

老师回复后原样转换（编号顺序就是菜单顺序，七项一定会全记）：

```bash
python3 scripts/plan.py make --confirmed --range B --features 1,3,5 --out generation-plan.json
python3 scripts/plan.py make --confirmed --range C --sections reading,A --features 沿用上次 --previous 上次的plan.json
python3 scripts/plan.py check generation-plan.json
```

`--range`：A 独立听力精听（intensive）/ B 整卷（all）/ C 指定板块（需 `--sections`）。`--features` 接受编号、`全部`、`基础讲评即可`、`沿用上次`。**`--confirmed` 是必填**：只有真的收到老师回答才加，脚本不替老师回答（缺它会直接报错，不会写出一份假计划）。

文化背景被选中时，必须执行 [本篇文化背景规范](culture-background.md)：原文切入、已查证背景、回到本篇的理解和课堂讲述。新生成数据必须填写 reading_connection 与来源 supports，并完成语义复核；不接受测试占位卡或通用百科拼贴。
