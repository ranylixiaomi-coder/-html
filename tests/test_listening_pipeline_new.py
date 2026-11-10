import json,subprocess,sys,tempfile,unittest,wave
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import listening_pipeline as lp,speech_runtime
from audio_wiring import wire_audio
from platform_tools import find_tool

class ListeningPipeline(unittest.TestCase):
    def test_intro_and_second_repeat_are_excluded(self):
        text='I bought a football in that new department store. It cost fifteen pounds.'
        exam={'sections':[{'id':'L1','kind':'listening','paragraphs':[{'id':'p','text':text}],'questions':[{'id':'1'}]}]}
        rows=[{'start':0,'end':15,'text':'现在听下面第一段录音'}, {'start':20,'end':30,'text':text},{'start':32,'end':42,'text':text}]
        r=lp.group_windows(exam,{'segments':rows},50);self.assertFalse(r['issues']);self.assertAlmostEqual(r['segments'][0]['start'],19.7);self.assertFalse(r['segments'][0]['verified'])
    def test_no_text_does_not_invent_windows(self):
        r=lp.group_windows({'sections':[{'id':'L1','kind':'listening','paragraphs':[]}]},{'segments':[]},40);self.assertTrue(r['issues']);self.assertFalse(r['segments'])
    def test_adjacent_asr_segments_do_not_lose_second_group(self):
        texts=['We should leave before eight.', 'The train arrives after nine.']
        exam={'sections':[{'id':f'L{i+1}','kind':'listening','paragraphs':[{'text':text}]} for i,text in enumerate(texts)]}
        rows=[{'start':i+1,'end':i+2,'text':text} for i,text in enumerate(texts)]
        windows=lp.group_windows(exam,{'segments':rows},4)
        self.assertFalse(windows['issues'])
        first,second=windows['segments']
        self.assertEqual(second['start'],2)
        self.assertEqual(first['end'],second['start'])
    def test_no_matching_text_stops(self):
        r=lp.group_windows({'sections':[{'id':'L1','kind':'listening','paragraphs':[{'text':'Something completely different.'}]}]},{'segments':[{'start':1,'end':4,'text':'Nothing matches today'}]},5);self.assertTrue(r['issues'])
    def test_question_preserves_whole_sentence_and_pending(self):
        words=[{'word':t,'start':i,'end':i+.5} for i,t in enumerate(['We','should','not','leave','until','nine.'])]
        exam={'sections':[{'id':'L1','questions':[{'id':'1','evidence':[{'quote':'until nine'}]}]}]}
        r=lp.question_contexts(exam,{'segments':[{'id':'L1','start':0,'end':6,'words':words}]})
        self.assertFalse(r['issues']);self.assertEqual(r['segments'][0]['context'],'We should not leave until nine.');self.assertFalse(r['segments'][0]['verified'])
    def test_ambiguous_evidence_stops(self):
        words=[{'word':w,'start':i,'end':i+.2} for i,w in enumerate(['nine','nine'])]
        r=lp.question_contexts({'sections':[{'id':'L1','questions':[{'id':'1','evidence':[{'quote':'nine'}]}]}]},{'segments':[{'id':'L1','start':0,'end':3,'words':words}]});self.assertTrue(r['issues'])
    def test_existing_timed_text_skips_runtime(self):
        with patch.object(speech_runtime,'probe',side_effect=AssertionError('must not probe')):
            self.assertEqual(speech_runtime.choose(timed_transcript=True)['backend'],'timed_transcript')
    def test_install_needs_authorization(self):
        with tempfile.TemporaryDirectory() as t,patch.object(speech_runtime,'probe',return_value={'status':'needs_setup'}),patch.object(speech_runtime,'run',side_effect=AssertionError('must not install')):
            self.assertEqual(speech_runtime.prepare(Path(t)/'venv')['status'],'awaiting_install_approval')
    def test_venv_executable_not_resolved_out_of_environment(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/'python';p.write_text('fixture')
            with patch.object(Path,'resolve',side_effect=AssertionError('must not resolve venv symlinks')):
                self.assertIn(str(p),speech_runtime.candidates(str(p)))

    @unittest.skipUnless(find_tool('ffmpeg') and find_tool('ffprobe'),'需要 FFmpeg 和 ffprobe')
    def test_cut_cli_preserves_wav_provenance_and_resumes_with_in_place_transcript(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            audio=root/'测试录音.wav'
            with wave.open(str(audio),'wb') as recording:
                recording.setparams((1,2,16000,0,'NONE',''))
                recording.writeframes(b'\0\0'*48000)
            source=lp.sha256(audio)
            output=root/'output';output.mkdir()
            transcript=output/'transcript.json'
            lp.save(transcript,{'source_audio_sha256':source,'segments':[{'start':0,'end':2.5,'text':'The train arrives after nine.'}]})
            reviewed={'question_ids':['1'],'verified':True,'evidence':'合成测试材料的预先设定时间与范围'}
            manifest=root/'cuts.json'
            lp.save(manifest,{'source_audio_sha256':source,'expected_group_ids':['L1'],'expected_question_ids':['1'],
                              'segments':[{**reviewed,'id':'L1','start':0,'end':2.5,'opening_quote':'The train arrives after nine','closing_quote':'The train arrives after nine'},
                                          {**reviewed,'id':'Q1','group_id':'L1','start':.5,'end':1.7}]})
            command=[sys.executable,str(ROOT/'scripts/listening_pipeline.py'),'cut','--audio',str(audio),
                     '--manifest',str(manifest),'--transcript',str(transcript),'--out',str(output)]
            def invoke():
                result=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',timeout=30)
                self.assertEqual(result.returncode,0,result.stderr)
                return json.loads(result.stdout)
            self.assertEqual(invoke()['status'],'cuts_verified_by_record')
            self.assertEqual(lp.sha256(output/'full.wav'),source)
            exam={'sections':[{'id':'L1','kind':'listening','questions':[{'id':'1'}]}]}
            report=wire_audio(exam,root,output)
            self.assertEqual(report['pending'],[])
            self.assertEqual(report['questions_with_clip'],1)
            self.assertEqual(exam['sections'][0]['audio_alignment']['transcript_file'],'output/transcript.json')
            resumed=invoke()['cuts']
            self.assertEqual(resumed['text']['reused'],['L1'])
            self.assertEqual(resumed['question']['reused'],['Q1'])
