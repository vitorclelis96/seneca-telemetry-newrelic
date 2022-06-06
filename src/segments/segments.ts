import EventEmitter from "events"
import { Spec } from "../types"
import { SegmentShim, shim } from "./shim"

export class Segments extends EventEmitter {
  inwardTasks: Record<string, (spec: Spec) => void> = {}
  outwardTasks: Record<string, (spec: Spec) => void> = {}
  shim: SegmentShim
  status: boolean = false
  static emitter: Segments | undefined

  private constructor() {
    super()

    this.inwardTasks = {}
    this.outwardTasks = {}

    this.shim = shim()

    this
      .on('disablePlugin', () => {
        this.inwardTasks = { remove_segment: this.shim.remove_segment }
      })
      .on('disableSegments', () => {
        this.inwardTasks = { remove_segment: this.shim.remove_segment }
      })
      .on('enableSegments', () => {
        this.inwardTasks = { ...(this.inwardTasks), add_segment: this.shim.add_segment }
        this.outwardTasks = { ...(this.outwardTasks), end_segment: this.shim.end_segment }
      })
      .on('statusChange', (status: boolean) => {
        if(this.status === true && status === true) {
          return
        }
        if(this.status === false && status === true) { // ON
          this.emit('enableSegments')
          this.status = true
        } else if (this.status === true && status === false) { // OFF
          this.emit('disableSegments')
          this.status = false
        }
      })
  }

  static emmiter() {
    if(this.emitter) {
      return this.emitter
    }
    const segments = new Segments
    this.emitter = segments
    return segments
  }

  inward(spec: Spec) {
    for(const [task, taskFunc] of Object.entries(this.inwardTasks)) {
      taskFunc(spec)
    }

    this.on('removeAllSegments', () => {
      this.shim.remove_segment(spec)
    })

    return this
  }

  outward(spec: Spec) {
    for(const [task, taskFunc] of Object.entries(this.outwardTasks)) {
      taskFunc(spec)
    }

    return this
  }
}   